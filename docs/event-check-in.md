# Event check-in (P0.9)

The Admin operations screen is `/admin/check-in`. Staff validate a QR or look up a
registration, review the safe attendee result, then explicitly confirm admission.
Lookup and validation never create attendance records.

## Existing boundaries reused

- `backend/src/eventPass/eventPassCredential.ts` generates the opaque credential,
  hashes it with SHA-256, and renders the QR. QR credentials are sent in POST
  bodies; only hashes reach the lookup repository.
- `backend/src/repositories/checkIn.repository.ts` reads existing registration,
  authoritative payment, Student verification and Event Pass state. It records
  admissions in `delegate_check_ins`, with unique `event_pass_id`, staff actor,
  method, admission time and creation time.
- `backend/src/services/checkIn.service.ts` projects only operational attendee
  fields and uses the existing Admin audit system. Confirmation audits share the
  admission transaction. Credentials and hashes are excluded from responses and
  audit metadata.
- Existing Admin sessions, mutation security and role permissions protect every
  endpoint. `SUPER_ADMIN`, `ADMIN` and `REGISTRATION_MANAGER` can read/manage
  check-in; `FINANCE` and `COMMUNICATIONS` cannot.

The confirmation transaction locks the current authoritative payment,
registration, Event Pass and Student verification, then reads eligibility again.
Two staff confirmations return one `CHECKED_IN` and one `ALREADY_CHECKED_IN`, with
the original admission timestamp. PostgreSQL uniqueness also prevents a second
attendance row.

Authoritative settled Paystack, bank-transfer and offline payments are consumed
equally. Reversed/refunded/reconciliation states require a staff financial
decision; check-in does not revoke the Event Pass or change financial records.

## Current event limitation

The existing registration/Event Pass model has no event entity and one pass per
registration. P0.9 retains that scope. The new attendance table has a nullable
`event_key` reserved for a later event migration; current recent/count endpoints
cover this installation's registrations, and today's count uses `Africa/Lagos`.
Before adding another conference in the same dataset, introduce an event identity,
backfill pass/registration/attendance relationships, and scope these queries to
the selected event. Reusing the same registration/pass for a future conference
would currently remain already checked in.

## Local acceptance

Run from `backend/` after migrations:

```powershell
npx tsx --test test/check-in.test.ts
npx tsx test/check-in.acceptance.ts
```

The PostgreSQL script restricts itself to local non-production databases, creates
synthetic packages, registrations, settled payment fixtures, Student states,
passes and staff, and deletes only its generated identifiers afterward. It calls
no payment or email provider. `test/check-in.fixtures.ts` exposes the same scoped
fixtures/cleanup for browser acceptance.

The focused tests cover eligibility, credentials, safe responses/audit/logging,
authentication, allowed/denied roles and mutation security. PostgreSQL acceptance
also covers concurrent/repeated admissions, QR/manual methods, database uniqueness,
financial/pass invariants, duplicate-success protection, and recent/count reads
through a new service instance.

Physical camera decoding and a real rear camera require an HTTPS-capable browser
and a device with camera access. Permission failure and manual fallback can be
tested without claiming successful camera decoding.

## Final verification (29 September 2026)

- Backend regression: 240/240; frontend regression: 95/95, run sequentially.
- Both package type-checks and production builds passed. Frontend lint had no
  errors and 12 existing warnings outside the check-in files. Vite retained its
  existing main-chunk size warning.
- PostgreSQL check-in acceptance passed, including simultaneous QR/manual
  confirmation. Financial-integrity and payment-retry acceptance also passed
  with provider/email stubs. Synthetic records were cleaned afterward.
- Browser checks at 375, 768 and 1440 pixels covered manual reference/email
  lookup, review, explicit confirmation, already-admitted and revoked states,
  recent/count persistence, refresh, Back/Forward, mobile navigation and signed-out
  route protection. Invalid QR rendering and camera lifecycle are covered by
  frontend tests. The browser displayed camera-unavailable fallback; physical QR
  decoding, mobile rear-camera behavior and production HTTPS remain device tests.
- The independent design evaluator was unavailable due to its usage limit;
  responsive screenshots were inspected directly.
- Migration status reported no pending migrations. No real charge or email ran.

## P0.9 file scope

New backend files: the `20261002000000000_event-check-ins` migration;
`checkIn` controller, repository, service, types and validator; and
`check-in.test.ts`, `check-in.fixtures.ts`, `check-in.acceptance.ts`.
Existing backend changes are limited to application/route wiring, permissions,
Admin action types and audit entity support.

New frontend files: `pages/admin/check-in/CheckInPage.tsx`,
`pages/admin/check-in/EventPassScanner.tsx`, `services/checkIn/checkInService.ts`,
and `test/checkIn.test.tsx`. Existing changes are route/navigation wiring,
Admin breadcrumbs, permission types, and the QR-scanner dependency/lockfile.
This document records the event-scope limitation and acceptance results.
