# Milestone 4C — Enquiries and Contact Management

The existing `/contact` form is the only public enquiry entry point. It calls `POST /api/enquiries`
through the real browser API client; no `mailto:` draft or generic participation form is used.
The backend strictly validates first and last name, email, optional phone/organization/country,
one of eight controlled categories, subject, message, and a 256-bit browser-generated
idempotency key. It returns a public `AIAIAC-ENQ-XXXXXXXX` reference, never an internal UUID.
No payment status, amount, or Admin decision can be supplied by the browser.

Migration `20260923000000000_enquiries.ts` adds `enquiries`, `enquiry_history`,
`enquiry_notifications`, and `enquiry_events`. Only a SHA-256 hash of the submission key and
payload fingerprint are stored. A matching retry returns the same reference; a changed payload
with the same key is rejected. A distinct key creates a distinct enquiry. Append-only history
records the actor, transition, and optional internal note. Legal transitions are OPEN to
IN_PROGRESS/RESOLVED/CLOSED, IN_PROGRESS to RESOLVED/CLOSED, and RESOLVED to CLOSED. Row locks
reject stale/repeated decisions with HTTP 409.

Protected Admin APIs are `GET /api/admin/enquiries` (paginated, searchable and filterable),
`GET /api/admin/enquiries/:reference`, and `POST` on `/:reference/in-progress`, `/resolve`,
`/close`, or `/notifications/retry`. `SUPER_ADMIN`, `ADMIN`, `REGISTRATION_MANAGER`, and
`COMMUNICATIONS` have `enquiries.read` and `enquiries.manage`; `FINANCE` has neither. The backend
enforces these permissions and Admin mutation CSRF/origin checks; frontend guards only improve
navigation. The Admin Overview counts OPEN and IN_PROGRESS enquiries in PostgreSQL and includes
enquiry lifecycle activity. Revenue remains restricted to PAID payment transactions.

Submission commits before email is attempted. The visitor acknowledgement contains conference
identity and reference without an SLA promise. Internal alerts are queued for active Admins
whose roles appear in `ENQUIRY_NOTIFICATION_ROLES` (default `SUPER_ADMIN,COMMUNICATIONS`).
Notification rows are unique per recipient, claimed with a lease, and marked SENT or FAILED.
Retry only claims pending/failed delivery; it cannot create a second successful acknowledgement
or change enquiry/payment state. As with the other Mailjet-backed ledgers, the rare
provider-success/database-update gap remains at-least-once, not exactly-once.

Deployment requires the migrated PostgreSQL database, `DATABASE_URL`, `SESSION_SECRET`,
`CLIENT_URL`, `ADMIN_FRONTEND_URL`, Mailjet sender credentials, and at least one active Admin in
a configured alert role. Set `VITE_API_URL` on the frontend when the API is on another origin.
Optional `ENQUIRY_RATE_LIMIT_WINDOW_MS` and `ENQUIRY_RATE_LIMIT_MAX` tune the per-instance public
limiter (production default: 10 per 15 minutes). Do not put server credentials in Vite variables.
The current workflow tracks statuses and internal notes only; it does not send a substantive
reply, assign owners, manage attachments, or implement a CRM. Admins must respond using their
approved communication channel.
