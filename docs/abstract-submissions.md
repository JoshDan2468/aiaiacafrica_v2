# AIAIAC 2027 Abstract submissions (Milestone 4B)

Optional AI classification and draft advisory quality assessment is documented in
[Abstract AI analysis](abstract-ai-analysis.md). It is disabled by default, uses separate PostgreSQL
jobs/results and a separately supervised worker, and cannot change human review status or decisions.

## Scope and business rules

Abstracts are a separate programme workflow. The public submission deadline is
`ABSTRACT_SUBMISSION_DEADLINE=2027-03-15T23:59:59+01:00` (West Africa Time, UTC+01:00),
inclusive. The backend clock and configured timestamp decide whether a **new** submission is
allowed. An existing `REVISION_REQUIRED` request may be edited and explicitly resubmitted after
that initial deadline. There is no Admin deadline bypass. The public page displays the brochure
deadline; changing the backend deadline requires updating that copy too.

The backend trims the abstract body, splits on Unicode whitespace (`/\s+/u`), and counts the
non-empty segments. Exactly 500 words are allowed; 501 are rejected. The frontend uses the same
rule for its live counter, but the backend is authoritative. Body length is additionally bounded
to 10,000 characters. Optional topic values are only the six approved categories already in the
brochure data. There is no speaker fee, Paystack transaction, revenue, or Event Pass in 4B.

## Architecture and data

The existing route → strict Zod validator → controller → service → PostgreSQL repository pattern
is preserved. Migration `20260922030000000_abstract-submissions.ts` creates:

- `abstract_submissions`: author identity/contact, content, server word count, status, safe public
  reference, timestamps, reviewer, SHA-256 content/key/continuation hashes.
- `abstract_submission_history`: append-only status/action trail with content snapshots, reviewer,
  reason/note, and timestamps.
- `abstract_notifications`: one row per notifiable history entry, recipient/reason snapshots,
  bounded attempts and delivery state.
- `abstract_recovery_tokens`: hashed, expiring, single-use recovery credentials.
- `abstract_events`: append-only activity events without raw credentials.

The public reference is `AIAIAC-ABS-XXXXXXXX`; it is an identifier, **not** an authorization
credential. Submission returns a 256-bit browser-generated idempotency key as the initial
24-hour continuation credential; only its SHA-256 hash is stored. A retry with the same key and
payload returns the existing submission, even after the deadline. A unique `(event_year,
author_email, content_fingerprint)` guard blocks identical content with a different key while
allowing the same author to submit a different abstract. Concurrent unique-key races are handled
as safe retries/conflicts. After recovery, the original continuation token is invalidated.

Recovery takes reference plus email and returns the same generic response whether or not they
match. A matching address receives a 30-minute single-use token in the URL fragment. Exchange
rotates the scoped continuation credential transactionally. Public requests are rate limited.
Recovery token hashes are stored; raw tokens are never written to activity/history or logs.

## Workflow and API

`SUBMITTED → UNDER_REVIEW → ACCEPTED | REVISION_REQUIRED | REJECTED`.
`REVISION_REQUIRED →` author edits permitted content `→` explicit resubmit `→ SUBMITTED`.
`ACCEPTED` and `REJECTED` are terminal for the author in V1. Review decisions lock the Abstract
row in a transaction; stale/conflicting decisions receive HTTP 409. Resubmission is similarly
locked. A revision/rejection requires a 10–1000-character author-visible reason; acceptance may
have an optional bounded internal note. Review history preserves earlier content and reasons.

Public routes:

- `POST /api/abstract-submissions`
- `GET /api/abstract-submissions/:reference/workspace`
- `PATCH /api/abstract-submissions/:reference/revision`
- `POST /api/abstract-submissions/:reference/resubmit`
- `POST /api/abstract-submission-recovery/request`
- `POST /api/abstract-submission-recovery/exchange`

Admin routes (session, server RBAC, and mutation protection as appropriate):

- `GET /api/admin/abstract-submissions` (page/limit/search/status; newest first)
- `GET /api/admin/abstract-submissions/:reference`
- `POST /api/admin/abstract-submissions/:reference/start-review`
- `POST /api/admin/abstract-submissions/:reference/accept`
- `POST /api/admin/abstract-submissions/:reference/request-revision`
- `POST /api/admin/abstract-submissions/:reference/reject`
- `POST /api/admin/abstract-submissions/:reference/notifications/retry`

`SUPER_ADMIN` and `ADMIN` may read/review. `REGISTRATION_MANAGER` may read only. `FINANCE` and
`COMMUNICATIONS` have no Abstract permission. Frontend route guards and hidden buttons are
presentation only; backend permissions are authoritative.

The Admin Overview now obtains Abstract total, pending/under-review, and accepted counts from
PostgreSQL. It adds Abstract activity to recent events. Revenue queries remain unchanged and
only include paid delegate transactions.

## Email, audit, and operations

Mailjet emails acknowledge submission, request revision with the exact instruction and a
short-lived recovery link, confirm resubmission, and communicate acceptance/rejection. Acceptance
does **not** claim payment availability. Notifications are queued in the transaction with each
state change, then claimed and delivered after commit. Provider failure leaves the state change
intact; protected retry can make up to three attempts, and a recorded success is not sent again.
Review-started email is deliberately omitted to avoid noise.

Events include submission, review started, revision required, resubmission, acceptance/rejection,
recovery request/exchange, and notification sent/failed. No raw token or provider secret is stored
in events. Operator log entries contain only a reference, notification ID, and error type.

Set `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_URL` (first allowed origin is used in public
recovery links), and the Mailjet variables
`MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_FROM_EMAIL` (plus optional
`MAILJET_FROM_NAME`) for real delivery. `ADMIN_FRONTEND_URL` should also point at the deployed
frontend base URL for Admin invitations. Optional
controls are `ABSTRACT_SUBMISSION_DEADLINE`, `ABSTRACT_CONTINUATION_TOKEN_TTL_HOURS`,
`ABSTRACT_RECOVERY_TOKEN_TTL_MINUTES`, `ABSTRACT_RATE_LIMIT_WINDOW_MS`, and
`ABSTRACT_RATE_LIMIT_MAX`. Apply migrations before serving routes.

## Manual acceptance

1. Visit `/registration/abstract`, check deadline and 500-word counter; submit with an author
   email accessible to the tester. Record the `AIAIAC-ABS-...` reference.
2. Confirm acknowledgement email and inspect `/admin/abstract-submissions` as `ADMIN` or
   `SUPER_ADMIN`. Confirm search/status filters and PostgreSQL-backed Overview count.
3. Open detail, start review, request revision with a specific instruction, and confirm the email
   includes that exact instruction and a secure link.
4. Follow the email link, edit title/body, save, explicitly resubmit, and verify a new history
   entry with no automatic acceptance.
5. Start review again and accept. Confirm the acceptance email does not claim payment is
   available, and no payment transaction or Event Pass was created.
6. Exercise a second record with rejection, and verify reason/history. Check an unauthorized
   role cannot review. Reuse a recovery link to verify it fails after one exchange.

For repeatable database acceptance with synthetic records and automatic cleanup, run
`cd backend; npx tsx test/abstract-submissions.acceptance.ts`. It uses a stub email provider;
real Mailjet deliverability must be checked separately in the deployment environment.

Limitations: email delivery is at-least-once across a rare provider-success/database-update gap;
the ledger cannot guarantee global exactly-once delivery. The existing in-process rate limiter is
per API instance, so a distributed deployment needs a shared limiter store for global limits.

Deferred: speaker fees/payments, presentation upload, scheduling, publication, reviewer scoring,
and peer review.

## Task 6: document upload safety gate

Abstract submissions currently accept **text only**. PDF and DOCX document uploads remain disabled
in the public interface. The existing create/revision/resubmit routes reject document and multipart
content with HTTP 415 before any attachment parsing, storage or persistence. Strict JSON schemas
also reject injected attachment/file/URL fields. This gate cannot be enabled through a browser flag
or by changing Student evidence settings.

The Student evidence volume and ClamAV adapters do not by themselves establish an approved Abstract
attachment workflow. Opening Abstract document uploads requires an organiser-approved maximum file
size, Abstract-specific private attachment persistence and retention, server-side PDF/DOCX content
validation, quarantine and fail-closed malware scanning, and an authenticated/RBAC-protected reviewer
download path. Scan failure or scanner unavailability must never make a file available to reviewers.
Attachments must preserve the existing reference, review records and append-only audit history.
No file-size limit has been invented, no attachment schema has been added and no upload files are
accepted by this implementation.

The existing text submission, deadline, reference, recovery and human review behavior remains intact.
Before public launch, verify deployed deadline/configuration, acknowledgment and recovery delivery,
and the full human review/revision cycle with controlled test records. Task 6 does not deploy or
perform live submissions.
