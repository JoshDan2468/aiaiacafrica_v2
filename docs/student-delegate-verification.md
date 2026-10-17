# Student Delegate verification, evidence, and review

Milestones 3B.1–3B.3 provide Student Delegate application, private evidence, explicit submission,
and controlled human review without pricing or payment. A Student application reuses
`delegate_registrations` for the common person and package record and has exactly one
`student_verifications` record for academic and current review state. `student_verification_events`
records safe operational events, while `student_verification_history` is the append-oriented
business timeline of submissions and review decisions.

## State model

- `NOT_SUBMITTED`: academic details are saved; eligible evidence may be edited.
- `PENDING`: evidence was explicitly submitted and is frozen while awaiting human review.
- `MORE_INFORMATION_REQUIRED`: a reviewer supplied an instruction and evidence editing reopens.
- `APPROVED`: current Student eligibility was verified; payment remains unavailable.
- `REJECTED`: eligibility was rejected with a reason and has no public reopening transition.

```text
NOT_SUBMITTED -> PENDING
PENDING -> APPROVED | REJECTED | MORE_INFORMATION_REQUIRED
MORE_INFORMATION_REQUIRED -> PENDING
APPROVED -> no public transition
REJECTED -> no public transition
```

The public API exposes only an intent-based submission action; it never accepts a target status.
The Admin API exposes separate approve, request-more-information, and reject actions.

## Evidence requirements and lifecycle

Minimum evidence readiness requires one `CURRENT_STUDENT_ID` and one of
`COURSE_REGISTRATION`, `ENROLMENT_LETTER`, `TUITION_OR_SCHOOL_FEE_RECEIPT`,
`TRANSCRIPT_OR_ENROLMENT_STATEMENT`, or `OTHER_INSTITUTIONAL_ENROLMENT_EVIDENCE`. Only current
`CLEAN` and `AVAILABLE` documents count. The backend re-evaluates readiness inside every relevant
transition; uploading ready evidence never submits or approves an application automatically.

The server accepts PDF, JPEG, and PNG files up to 5 MB each. It validates application eligibility,
the evidence-type allowlist, file presence and size, a safe single extension, declared MIME type,
detected magic bytes, and consistency between extension and detected content. It calculates a
SHA-256 checksum and random physical key. Original filenames are retained only as bounded sanitized
display metadata. Binary contents are not stored in PostgreSQL.

Uploads enter private storage with `PENDING_SCAN`, then a provider-neutral `MalwareScanner` returns
`CLEAN`, `INFECTED`, `UNAVAILABLE`, or `ERROR`. Only `CLEAN` becomes `AVAILABLE`; infected files are
`REJECTED`, and unavailable/error results remain quarantined. The development adapter deliberately
reports `UNAVAILABLE`. Production must provide an approved private scanner before evidence can
become reviewable.

## Ownership, storage, and editing rules

Creating a Student application returns a cryptographically random application-scoped continuation
token with a 24-hour default expiry. Only its SHA-256 hash is stored. Evidence and submission routes
require the matching public registration reference and token. Internal verification IDs, storage
keys, and raw tokens are not exposed.

`StudentEvidenceStorage` separates business logic from storage. Development storage is private,
has no static Express route, rejects arbitrary keys, and must never point at `frontend/public`.
Production needs durable private object storage or a private persistent volume.

Replacement creates a new document and key, marks the former row superseded, and preserves it for
history. Only one current document per evidence category is permitted and each category is capped at
three versions. Evidence editing is permitted only in `NOT_SUBMITTED` and
`MORE_INFORMATION_REQUIRED`; it is frozen in `PENDING`, `APPROVED`, and `REJECTED`. This ensures the
reviewer assesses a stable evidence set. Approval nevertheless rechecks current authoritative
readiness.

## Submission, review history, and concurrency

Submission changes `NOT_SUBMITTED` to `PENDING`; resubmission changes
`MORE_INFORMATION_REQUIRED` to `PENDING`. Duplicate or out-of-state requests return a safe conflict
without duplicate history, events, or notifications. Review is allowed only in `PENDING`. Approval
allows a bounded optional note; more-information and rejection require a meaningful bounded reason.

Submission and review lock the `student_verifications` row with PostgreSQL `FOR UPDATE`, then verify
the current state and evidence. Conflicting reviewers therefore cannot both commit. Each successful
action appends a `student_verification_history` row containing transition, reviewer when applicable,
note, and timestamp. Prior review cycles and superseded evidence remain intact.

Admin detail/evidence access requires `student_verifications.read`; decisions and notification retry
require `student_verifications.review`. The default policy grants both to `SUPER_ADMIN` and
`REGISTRATION_MANAGER`, while `ADMIN`, `FINANCE`, and `COMMUNICATIONS` are denied. Existing session,
CSRF/non-simple-header, and origin protections apply to Admin mutations.

## Secure continuation recovery

The public recovery form accepts registration reference plus registration email and always returns
the same response. A matching Student application receives a random short-lived, single-use
credential through email. PostgreSQL stores only its SHA-256 hash, invalidates an earlier unused
credential when issuing a new one, and consumes it atomically. Successful exchange rotates the
continuation-token hash and returns the new raw continuation token only to that browser request.

Recovery endpoints use a dedicated rate limit. Raw recovery and continuation tokens, sessions,
storage keys, paths, and documents do not enter audit metadata or logs. Recovery defaults to 30
minutes (`STUDENT_RECOVERY_TOKEN_TTL_MINUTES`). The emailed URL uses the first configured client
origin, which must be the correct public frontend origin in production.

## State notifications

Every successful transition creates one notification row uniquely linked to its history row.
Delivery begins only after the state transaction commits, so Mailjet failure cannot roll back a
valid decision. Claims are row-locked, use a ten-minute stale-claim lease, and are capped at three
attempts. A `SENT` row cannot be reclaimed; authorized reviewers can retry pending or failed rows.

Emails confirm submission/resubmission and pending review, include the exact Admin instruction for
more-information or rejection, and state that approval verifies eligibility but does not make
payment available. Documents are never attached. Normal decisions remain visible in history and
events; they do not automatically email Super Admin and create notification fatigue.

## Admin retrieval and events

Evidence is never publicly addressable. Protected downloads return only current `CLEAN`/`AVAILABLE`
records with detected MIME type, attachment disposition, `nosniff`, and private no-store headers.
The UI does not reveal keys, paths, or internal verification UUIDs.

Events cover application creation, evidence upload/replacement/scan/access, submission,
resubmission, all decisions, recovery request/exchange, and notification outcomes. Metadata contains
safe action information only—not tokens, keys, filesystem paths, file contents, credentials, or
session identifiers.

## Payment boundary and deferred work

Student payment initialization remains backend-authoritative and requires both `APPROVED` status and
an active `delegate_package_prices` row for the requested currency. The Student package intentionally
has no active price, so approval still cannot create a payment transaction or call Paystack.
Professional Delegate pricing/payment is unchanged.

Production still requires approved durable private storage, a real malware-scanner adapter, Mailjet
configuration, TLS, and a correct client origin. Retention/deletion policy remains an organizer/legal
decision. Milestone 3B.4 is responsible for any approved Student price, currency behavior, checkout,
and downstream paid-delegate/event-pass flow. This milestone infers no Student price.

## Explicit production evidence providers

`createConfiguredApplication({ studentEvidenceProviders: { storage, scanner } })` accepts an
explicitly constructed provider pair. `createStudentEvidenceProviders` validates the method
interfaces and runs the existing production-readiness assertion unchanged. In production, both
adapters must declare the literal `productionReady: true`; missing, incomplete, unreviewed or
invalid providers fail application assembly before the server listens. Production never selects
the local storage or unavailable scanner defaults. Outside production, omitting the pair retains
`LocalStudentEvidenceStorage` and `UnavailableMalwareScanner`, including quarantine when scanning
is unavailable.

`STUDENT_EVIDENCE_ENABLED` accepts only `true` or `false` and defaults to `true`. Explicitly setting
it to `false` pauses Student evidence: no storage/scanner providers are constructed, production
startup does not require them, and evidence upload, retrieval, verification-state/submission and
Admin evidence-detail routes return a safe 503 before touching evidence or parsing uploads.
The public UI checks backend availability before showing upload controls. Existing records remain
intact, and registration, recovery and existing review/notification workflows remain unchanged.

The normal production `server.ts` entry point now supplies a checked private filesystem adapter
and a local ClamAV `clamd` Unix-socket scanner. `STUDENT_EVIDENCE_STORAGE_DIR` must be an explicit
absolute path to an existing directory outside the application release/web roots, owned by the API
user and mode 0700. The server checks the directory before listening; the volume must be durable,
backed up, and restored separately from application releases. Stored files remain mode 0600 with
opaque keys. `STUDENT_EVIDENCE_CLAMD_SOCKET` must name an absolute local socket path accessible to
the API user. Startup requires a successful `PING`/`PONG` exchange; uploads use `INSTREAM` and only
an explicit `stream: OK` result becomes available. A missing service or malformed scan response
fails closed. The strict production-readiness assertion remains unchanged. The application-factory
option remains a trusted code composition boundary, not an API payload or browser setting.
Configure `clamd` with a local Unix socket and `StreamMaxLength` above the 5 MiB application file
limit, keep signatures refreshed with `freshclam`, and do not expose a clamd TCP listener publicly.

A reviewed storage adapter must implement `store`, `retrieve` and `delete`, persist exact bytes
durably under opaque keys, avoid overwriting another evidence object, prevent key traversal, and
use private access controls for all objects, including quarantined evidence. It must not expose
public object URLs, public static directories or frontend credentials. Access remains through the
existing authorized backend download flow. Provider permissions, encryption, backup and retention
arrangements must be established before the adapter declares production readiness.

A reviewed scanner adapter must implement `scan` for the supplied bytes, detected MIME type and
SHA-256 checksum. It must obtain a real antivirus verdict for those exact bytes, support PDF/JPEG/PNG
and the existing file-size limits, bound connection/scan timeouts, and fail closed on errors,
unavailability or invalid responses. Only a definitive clean verdict may return `CLEAN`; infected
evidence returns `INFECTED`, and failures return `ERROR`/`UNAVAILABLE` or throw. A maintained private
antivirus service/daemon or an approved authenticated scanning service can satisfy this interface;
an unconditional clean response cannot. Both adapter constructors must reject missing/invalid
configuration before application assembly and use sanitized failure messages.

The readiness marker is a reviewed adapter capability declaration, not proof of durable storage or
current antivirus signatures. Startup also checks storage permissions and daemon responsiveness;
operations still fail closed if either dependency later fails. Keep `clamd`/`freshclam` managed and
monitor signature freshness, free space, and scanner failures. Tests exercise the socket protocol
against a local fake daemon but do not certify an installed antivirus service. Evidence
validation, authorization, audit records, quarantine transitions and Student workflow rules remain
in the existing service/controller/repository boundaries.
