# AIAIAC 2027 engineering state

Last updated: 29 September 2026. Current milestone: **P0.11 — Production Infrastructure,
Deployment & Recovery Architecture (planning complete; no production changes made)**. Next planned
milestone: **P0.12 — production-ready Student evidence storage and malware scanning**, after the
documented provider and ownership decisions are resolved.

## Stack and architecture

- Two independent npm packages: `frontend/` (React 19, TypeScript, Vite 8, Tailwind CSS 4) and `backend/` (Express, TypeScript, PostgreSQL, `node-pg-migrate`). Root scripts wrap package commands; this is not an npm workspace.
- Backend feature flow: **route → strict Zod validator → controller → service → parameterized repository → PostgreSQL**. Migrations are explicit; server startup never creates schema.
- Frontend route pages live under `frontend/src/pages/{public,registration,admin}`; reusable UI is in `components`, editable conference content in `data`, and browser API calls in feature-specific `services`. The Contact route is `/contact`.
- Protected Admin access uses invitation-only staff accounts, Argon2id password hashes, an HttpOnly cookie, PostgreSQL session storage, and a database reload of the Admin on protected requests. Session JSON enforces 30-minute sliding inactivity and a fixed 12-hour absolute lifetime. No public Admin signup or browser JWT. `backend/src/config/permissions.ts` is the authoritative role-to-permission policy; route middleware enforces it. Authenticated mutations require a non-simple CSRF header plus configured-origin checks. See [Admin access](admin-access.md).
- Email is provider-neutral through `EmailService` and the Mailjet adapter. Controllers do not call Mailjet. Where implemented, state changes commit first, with independently retriable notification-ledger delivery. A Mailjet failure must not change financial or workflow truth.
- Professional Delegate prices are authoritative PostgreSQL rows: USD 1,500.00 and NGN ₦2,100,000. Backend-only Paystack initialization/verification and signed webhooks share an idempotent, row-locked finalizer. Browser amounts and callback query parameters are untrusted. See [Delegate payments](delegate-payments.md).
- A trusted PAID payment triggers one hashed opaque QR Event Pass per registration; delegate and configured oversight notification delivery is independently retryable. Overview revenue sums only PAID payment snapshots, separately by currency. See [Payment completion](payment-completion.md).

## Modules and business boundaries

| Module | Current state |
| --- | --- |
| Admin access/RBAC | Implemented; Super Admin controls users and roles. |
| Professional Delegate | Registration, dual-currency pricing, Paystack payment, and pass completion implemented. |
| Student Delegate | Application/evidence/review implemented; intentionally **unpriced** and unable to initialize payment until separately approved/configured. See [Student verification](student-delegate-verification.md). |
| Sponsor/Exhibitor | Separate server-priced application/review workflows implemented; confirmation is **not** payment or revenue. See [Commercial applications](commercial-applications.md). |
| Abstracts | Separate submission/revision/Admin review implemented, 500-word cap and 15 March 2027 WAT deadline; acceptance is **not** speaker payment or pass issuance. See [Abstract submissions](abstract-submissions.md). |
| Enquiries | Milestone 4C implemented: the existing Contact form posts to a dedicated enquiry API; PostgreSQL owns queue/status/history, notification delivery, and Overview counts. See [Enquiries](enquiries.md). |
| Reporting & Exports | Milestone 5A implemented: seven read-only report domains, server-paginated previews, backend CSV exports, a financial management summary, and export metadata audit. No reporting copy of business data. See [Reporting & Exports](reporting-and-exports.md). |

## Applied migrations (oldest first)

Migrations 1–12 were applied before 4C; migration 13 during 4C, migration 14 during 5A, and migration 15 during 5B. Latest `migration:status` reported no pending work.

1. `20260820060315610_admin-authentication.ts`
2. `20260902090000000_delegate-registration.ts`
3. `20260914000000000_admin-user-access.ts`
4. `20260915000000000_delegate-payments.ts`
5. `20260917000000000_professional-dual-currency-pricing.ts`
6. `20260920000000000_payment-completion-and-event-passes.ts`
7. `20260920010000000_student-verification-foundation.ts`
8. `20260921000000000_student-evidence-storage.ts`
9. `20260921010000000_student-verification-workflow.ts`
10. `20260922010000000_student-verification-reason-constraint.ts`
11. `20260922020000000_commercial-applications.ts`
12. `20260922030000000_abstract-submissions.ts`
13. `20260923000000000_enquiries.ts`
14. `20260924000000000_report-export-audit.ts`
15. `20260924010000000_admin-session-audit.ts`

Never edit an applied migration. Add a new migration for later schema changes.

## Security invariants and production limitations

- Backend-only secrets (`DATABASE_URL`, session secret, Paystack key, Mailjet credentials); exact-origin CORS, Helmet, bounded request bodies, strict validation, parameterized SQL, safe errors/logging, and server-side RBAC. Public references are identifiers, not credentials. Token-backed features store hashes, not raw credentials. Untrusted text is never rendered as HTML.
- Production Student evidence still needs approved durable private storage and a malware-scanner adapter before evidence can become reviewable. Mailjet and deployment TLS/origin configuration require environment validation. Paystack USD capability must be confirmed for the organizer's merchant account before live USD checkout. Existing in-process public rate limits are per API instance. Notification ledgers are at-least-once across the rare provider-success/database-update gap. See the linked module docs for details.
- Deferred: Student pricing/payment, Sponsor/Exhibitor payments/invoicing, speaker fees, event-day pass scanning, refunds, CRM/live chat/AI replies, complex assignment, and any milestone not explicitly scoped.
- Reporting exports use explicit allowlisted projections and validated server-side filters, never arbitrary SQL or a browser-side all-pages fetch. CSV neutralizes formula prefixes. Revenue uses PAID transactions only and keeps NGN and USD separate. `reports.read`, `reports.export`, and `reports.financial` are server-enforced alongside each domain's read permission. Export audit stores metadata, not files or row copies. PDF management summary is deferred; exports are capped at 50,000 rows and are not transactionally frozen across batches. See [Reporting & Exports](reporting-and-exports.md).

## 4C checkpoint

At entry: no enquiry tables, API, Admin queue/detail, or PostgreSQL Overview enquiry counter. 4C added a dedicated enquiry migration; strict public submission; hashed 256-bit retry-key persistence; protected, filterable Admin queue/detail and status transitions with internal-note history; post-commit visitor/Admin notification ledger and retry; and PostgreSQL Overview open-enquiry count/activity. PostgreSQL synthetic acceptance passed and cleaned up its records; the complete backend/frontend suites, type-checks, builds, and lint checks passed (lint retains 13 pre-existing warnings). `git diff --check` retains only three unrelated trailing-whitespace lines in `CountryFlag.tsx`. Payment, pass, Student, commercial, Abstract, and auth business logic were not modified. Next milestone remains **unspecified**.

## 5A checkpoint

5A added reporting APIs and an Admin page for Professional Delegates, Students, payments, Sponsors, Exhibitors, Abstracts, and Enquiries; a limited financial management summary; and a new export-audit table. The seven reports read existing PostgreSQL records and export filtered UTF-8 CSV in bounded server batches. No business module data or workflows were changed. Real PostgreSQL acceptance matched direct counts and currency-separated PAID revenue, generated/inspected CSV, and cleaned its synthetic audit row. Backend 170/170 and frontend 63/63 tests passed; both type-checks and production builds passed. The next milestone remains **unspecified**.

## 5B checkpoint

5B extended the existing PostgreSQL-backed Admin session, without a new session table or JWT. Login rotates the session ID and persists login/activity timestamps in session JSON. Every protected request rejects after 30 minutes idle or 12 hours absolute, refreshes only the idle deadline after successful authentication, and reloads account status/role. Production cookies remain HttpOnly, Secure, SameSite=Lax; development allows HTTP. Logout destroys the row and clears the cookie. The shared Admin frontend API boundary handles protected 401 responses, redirects to login with the expiry message, and uses a reason-only storage event to synchronize tabs. New migration 15 permits login, logout, and observed-expiry audit actions. `ADMIN_SESSION_IDLE_MINUTES` and `ADMIN_SESSION_ABSOLUTE_HOURS` default to 30 and 12. Real PostgreSQL synthetic acceptance verified persistence, access, logout revocation, and audit, then cleaned records. Final backend 176/176 and frontend 68/68 tests passed; both type-checks and production builds passed. Lint had 0 errors and 13 pre-existing warnings; the frontend build retained its existing large-chunk warning. The optional five-minute browser warning is not implemented. Expiry audit is best effort on an observed expired request; silent cookie/store expiration has no event. Next planned milestone is **5C — Admin UI Refinement**; do not begin it here.
5B extended the existing PostgreSQL-backed Admin session, without a new session table or JWT. Login rotates the session ID and persists login/activity timestamps in session JSON. Every protected request rejects after 30 minutes idle or 12 hours absolute, refreshes only the idle deadline after successful authentication, and reloads account status/role. Production cookies remain HttpOnly, Secure, SameSite=Lax; development allows HTTP. Logout destroys the row and clears the cookie. The shared Admin frontend API boundary handles protected 401 responses, redirects to login with the expiry message, and uses a reason-only storage event to synchronize tabs. New migration 15 permits login, logout, and observed-expiry audit actions. `ADMIN_SESSION_IDLE_MINUTES` and `ADMIN_SESSION_ABSOLUTE_HOURS` default to 30 and 12. Real PostgreSQL synthetic acceptance verified persistence, access, logout revocation, and audit, then cleaned records. Final backend 176/176 and frontend 68/68 tests passed; both type-checks and production builds passed. Lint had 0 errors and 13 pre-existing warnings; the frontend build retained its existing large-chunk warning. The optional five-minute browser warning is not implemented. Expiry audit is best effort on an observed expired request; silent cookie/store expiration has no event.

## 5C checkpoint

5C standardized the Admin UI across all operations screens into a cohesive enterprise design system using clean Inter typography, neutral surfaces (`#05190F` sidebar, `slate-50` canvas), and semantic status tokens. Reusable components (`AdminSidebar`, `AdminTopbar`, `AdminPageHeader`, `AdminTable`, `AdminStatusBadge`, `AdminMetricCard`, `AdminFilterBar`) were deployed across all admin modules (Overview, Delegates, Payments, Student Verifications, Commercial Applications, Abstracts, Enquiries, Reports & Exports, and User Management). In accordance with the Admin Overview Cleanup Addendum, the presentation-only "System Health & Security" card and redundant "Operations Workspace" shortcuts were removed from the dashboard, leaving a focused 13-metric conference summary and authoritative recent activity stream. All underlying backend security, RBAC, sessions, and protections remain 100% intact. Obsolete manual development tooling (`ImageMapperPage`) was deleted. Route-level lazy loading (`React.lazy()`) was introduced in `App.tsx` and `AdminLayout.tsx`, code-splitting the admin suite and reducing initial bundle download for public visitors. All 176 backend tests and 68 frontend tests passed; both type-checks and production builds passed; lint passed with 0 errors (13 pre-existing shared UI warnings). See [Admin UI](admin-ui.md). Next planned milestone is **unspecified**.

## P0.5B — Conference Email & Communications Centre

- Separate Admin workspace and protected `/api/admin/communications` API. Transactional registration, payment/Event Pass, Student, invitation and workflow emails are unchanged. Campaign mail reuses the provider-neutral `EmailService`, Mailjet adapter, and branded layout, with a distinct communications footer. Raw HTML editing is not offered; content is escaped and optional CTAs require HTTPS.
- Backend permissions `communications.read/create/send/manage` are granted to SUPER_ADMIN, ADMIN and COMMUNICATIONS. FINANCE and REGISTRATION_MANAGER have none. All mutations require session authentication, CSRF header and origin checks; test/delivery actions are rate-limited. The Communications role gains no finance, payment, user-management or Student-review authority.
- PostgreSQL migration `20260927000000000_communication-campaigns.ts` adds campaign and per-recipient delivery tables, status/attempt checks and unique `(campaign_id,recipient_email)` suppression, plus allowlisted Admin audit actions. Campaign creation/update and final confirmation audit are transactional. Audit records contain actor, campaign UUID/reference, action and timestamp, not recipient lists or provider credentials.
- Server-owned, allowlisted audiences: All/Professional/Student Delegates; all/confirmed Sponsors; all/confirmed Exhibitors; Abstract Authors. Delegate filters: registration/payment status, Student verification status, country, and paid transaction currency. Abstract status is supported. Emails are normalized/deduplicated, invalid addresses excluded, and the browser submits filters rather than addresses. A count/fingerprint is recomputed at confirmation; changed audiences require fresh review. Confirmation persists the exact recipient snapshot.
- Campaign flow: DRAFT → SENDING → SENT, PARTIALLY_FAILED or FAILED. Composer has count, same-path preview, one-address test send, save/edit, review and explicit confirmation. Test send is prefixed `[TEST]`, audited and does not create a delivery row. Five static communications presets cannot edit transactional templates. Campaign history and paginated/filterable delivery activity expose safe provider acceptance IDs and sanitized error class names.
- Delivery is operator-supervised, at most 500 distinct recipients/campaign and 10 records per batch, sent sequentially. PostgreSQL row locks/`SKIP LOCKED` claim each recipient; successes are never retried, failures have at most three attempts. Browser interruption leaves remaining PENDING entries resumable. An interrupted CLAIMED entry is deliberately *not* auto-retried, because a provider acceptance with a lost database update is ambiguous; it requires investigation/reconciliation. This is not a general high-volume queue and does not promise exactly-once delivery across a process crash.
- `COMMUNICATIONS_BULK_SEND_ENABLED=false` by default is an operational/consent gate for confirmation and delivery. Preview, drafts, counts and one-address test send remain available if Mailjet is configured. Enable only after Joshua approves the communications purpose/consent and opt-out policy and confirms Mailjet sender/domain, quota and deliverability. No real Mailjet campaign was sent in automated acceptance; the PostgreSQL acceptance uses synthetic records and a recording provider and removes its records.

## P0.11 — Production Infrastructure, Deployment & Recovery Architecture

- Documentation-only architecture audit completed; no deployment, DNS, live-provider, payment,
  scanner, database, or application behaviour was changed.
- Recommended topology: the same static Vite artifact on `www.aiac-africa.com` and
  `admin.aiac-africa.com`; one supervised Node API behind `api.aiac-africa.com`; managed
  PostgreSQL; private durable Student evidence storage; and a fail-closed production malware
  scanner. Exact-origin CORS, TLS, proxy trust, secrets, explicit migrations, backups, monitoring,
  capacity measurement, and recovery procedures are documented.
- Smartweb's public material supports considering it for static cPanel hosting, but does not prove
  the Node/PostgreSQL/process/storage/scanner capabilities required for the full system. Status:
  **insufficient evidence — Joshua must check the exact plan**.
- Production remains blocked by design while the local-only Student evidence storage and
  unavailable scanner adapters are installed. See
  [P0.11 production infrastructure](P0.11-PRODUCTION-INFRASTRUCTURE.md). Next milestone is P0.12
  after Joshua resolves the document's provider, recovery, ownership, capacity, Paystack, and
  Mailjet questions.
