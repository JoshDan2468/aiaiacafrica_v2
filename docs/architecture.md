# Architecture

## Repository structure

The repository contains three independent Node packages:

```text
frontend/  React 19, TypeScript, Vite 8, and Tailwind CSS 4
admin/     Extracted React 19, TypeScript, Vite 8, and Tailwind CSS 4 Admin application
backend/   Express, TypeScript, and the PostgreSQL connection boundary
```

The packages have separate manifests, lockfiles, TypeScript configurations, dependency trees, and
build outputs. Root scripts are convenience wrappers only; the repository does not use npm
workspaces.

The public and Admin applications are separated: `frontend/` contains only public and attendee
flows, and `admin/` is the authoritative Admin frontend. Public `/admin/*` URLs resolve to the
public not-found page. Each application builds its own independent `dist/`.

## Frontend

Browser code lives in `frontend/src/`. Its flow remains:

```text
App route -> page -> section/form -> typed data or frontend service
```

Public pages live in `frontend/src/pages`, reusable UI in `frontend/src/components`, editable
conference content in `frontend/src/data`, and browser-to-API boundaries in
`frontend/src/services`. UI components must not contain database or server business logic.

Each route-level page has its own lowercase folder beneath its access area (`public`,
`registration`, or `system`). The `*Page.tsx` file is the composition boundary: it owns
page metadata and route-level state, then renders sibling `*Section.tsx` files in page order. A
section stays local to its page until it is genuinely reused; shared sections and controls belong
in `frontend/src/components`.

The existing participation UI is transitional. Delegate, sponsor, exhibitor, partner,
media-partner, abstract, and general-enquiry workflows require separate fields, validation,
services, admin handling, and reporting as each workflow is approved. Do not expand the legacy
shared participation form into a production workflow.

## Backend foundation

The implemented request flow is:

```text
Express middleware -> /api router -> controller -> JSON response
```

Backend modules include application/server composition, environment and PostgreSQL configuration,
liveness/readiness, request logging, not-found and centralized error handling, plus the Admin
authentication boundary. PostgreSQL configuration remains optional for the health-only app factory
used by unit tests, while the configured server requires PostgreSQL and a session secret. Readiness
is proved with a lightweight query and reports a sanitized failure when PostgreSQL is unavailable.

Future database-backed requests will follow:

```text
route -> validation/auth middleware -> controller -> service -> database
```

Admin authentication follows that flow using strict validation, controllers, an authentication
service, and a parameterized Admin repository. Repeatable migrations are managed deliberately
through `node-pg-migrate`; the server never creates tables automatically. Only `admins` and
PostgreSQL-backed `session` exist. Registration APIs and payment integration are not part of the
current foundation.

Authentication uses an HttpOnly session cookie with the identifier stored only in the cookie and
session data stored in PostgreSQL. Login regenerates the session; logout revokes it. Login time
and last authenticated activity in session JSON enforce a sliding 30-minute inactivity limit and
fixed 12-hour absolute limit on the backend. Cookie/store expiry never exceeds the absolute limit.
Protected requests reload the Admin to reject deleted or disabled accounts and apply changed roles
immediately. Authorization checks run independently on each role-restricted backend route.

## Security and roles

Secrets, PostgreSQL credentials, and Paystack secret keys are backend-only environment variables.
Payment initialization and verification will happen on the backend; never trust amounts, roles,
or payment success supplied by the browser.

Admin APIs enforce authentication and authorization server-side. Roles are `SUPER_ADMIN`, `ADMIN`,
`FINANCE`, `REGISTRATION_MANAGER`, and `COMMUNICATIONS`.
`backend/src/config/permissions.ts` is the single role-to-permission policy, and protected routes
enforce permissions server-side. Client-side route hiding is presentation, not authorization.
Authenticated Admin mutations require a non-simple security header and validate supplied browser
origins/referrers in addition to exact-origin CORS and `SameSite=Lax` cookies.

Staff accounts are invitation-only. A raw cryptographically random token is sent through the
provider-neutral email boundary while PostgreSQL stores only its SHA-256 hash. Invitation
acceptance locks the invitation and transactionally creates the Admin, consumes the invitation,
and writes its audit event. See [`admin-access.md`](admin-access.md) for the complete lifecycle.

Professional Delegate payment uses the same route/controller/service/repository boundaries. An
authoritative `delegate_package_prices` row supplies currency and minor-unit amount; the browser
cannot supply an amount. Payment attempts snapshot package, currency, and amount before the
provider call. Callback verification and signature-authenticated Paystack webhooks share one
row-locked, idempotent finalizer. Full design and test-mode operations are in
[`delegate-payments.md`](delegate-payments.md).

Trusted PAID payments then enter a separate completion workflow. It creates one hashed opaque
event-pass credential per registration, delivers the QR pass through the existing Mailjet
boundary, and notifies configured oversight roles without coupling email success to payment state.
The protected Admin overview obtains aggregate registration and currency-separated revenue values
directly from PostgreSQL. See [`payment-completion.md`](payment-completion.md).

Student Delegate applications reuse the common registration record and attach one academic
verification aggregate. Private evidence uses an application-scoped hashed continuation token,
storage/scanner abstractions, quarantine lifecycle, and permission-protected attachment retrieval.
Explicit Student submission and resubmission, row-locked human review, append-only decision history,
single-use email recovery, and independently retriable state notifications form the review workflow.
The package remains intentionally unpriced; backend payment initialization requires both approval
and an active database price. See
[`student-delegate-verification.md`](student-delegate-verification.md).

Each newly committed Professional or Student delegate registration queues an operational email
for each active `SUPER_ADMIN` and `ADMIN`. A unique registration/Admin ledger prevents duplicate
sends and tracks delivery independently of the registration itself. Failed email delivery cannot
undo a registration; the recipient roles default to `SUPER_ADMIN,ADMIN` and can be restricted
through `REGISTRATION_NOTIFICATION_ROLES` when required by deployment policy.

Abstract submission and review is a separate author/programme workflow with dedicated tables,
hashed continuation and recovery credentials, append-only review history, row-locked decisions,
and post-commit notification retry. See [`abstract-submissions.md`](abstract-submissions.md).

Public Contact enquiries now use a separate persistence/review workflow, not a generic
participation form. Its idempotent submission, bounded category schema, Admin-only status history,
notification ledger, and PostgreSQL Overview counter are described in
[`enquiries.md`](enquiries.md).

Admin reporting reads the seven existing domain tables with explicit allowlisted projections and
server-side filters. It creates no reporting copies of business records; only export metadata is
audited in a new table. CSV is generated server-side in bounded batches. The management summary
counts trusted PAID payment snapshots by currency. See [`reporting-and-exports.md`](reporting-and-exports.md).

## Deployment boundary

The backend Docker image includes compiled API and migrations. Root `compose.yaml` manages
PostgreSQL with verified TLS, ClamAV, private persistent evidence/audit volumes and ordered
initialization/migrations. `compose.interserver.yaml` adds the HTTPS reverse proxy. See
[Docker deployment](docker-deployment.md) for local and InterServer operations.

Frontend hosting must use `frontend/` as the Vite project root and serve `frontend/dist`. The API
is a separate deployable package in `backend/`. CORS origins must be explicitly configured for the
deployed frontend; CORS does not replace authentication.

Communications Center safety, scheduling, consent/suppression and provider reporting extend the existing campaign ledger and Mailjet boundary. See [Communications Center](communications-center.md) for workflow, fixture verification and controlled activation requirements.
