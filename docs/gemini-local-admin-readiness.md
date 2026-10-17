# Local Gemini Admin preparation

Prepared 2026-10-16. No Gemini calls or abstract submissions were made.

- Admin: http://127.0.0.1:5174/admin/login
- API: http://127.0.0.1:5057 (loopback only).
- Vite mode `gemini-local` uses relative `/api` requests and proxies them to port 5057.
- Verified dedicated database `aiaiac_gemini_e2e_local` on loopback port 55437,
  with its dedicated owner and database identity marker. No existing development or
  production database was modified. There are zero abstracts, AI jobs or AI attempts.
- Added `ABSTRACT_VIEWER`, with exactly `abstracts.read`, because existing roles
  include unrelated permissions. Existing role permissions are unchanged. Applied
  the additive role constraint migration only to this dedicated database (34 total).
- A fictional bootstrap owner was created using the existing secure bootstrap service.
  The fictional viewer was then invited and accepted through the existing invitation
  service, using its normal password hashing, token hashing and audit records. Invitation
  delivery was captured locally in memory; no email was sent.
- Reviewer: `abstract-viewer@example.invalid`. Random passwords are stored only in
  ignored `.private/gemini-e2e-local/reviewer-credentials.json`; they were not logged.
  Do not share or commit that file. The viewer cannot start reviews or make decisions.
- The existing permission guard redirects the viewer from the overview to the abstract list.
  AI advisory information uses the existing abstract detail panel when results exist.

## Verification

Through the Admin proxy, login and abstract listing returned HTTP 200. User listing,
payment listing and start-review returned HTTP 403. The verification logged out afterward.
Safe output is in `output/gemini-e2e-local/admin-readiness.json`.

Backend permission/invitation tests: 13 passed. Admin user-access tests: 3 passed.
Existing AI advisory panel tests: 8 passed. Backend and Admin type checks and builds
passed. Admin lint remains at the previously reported 42 errors and 8 warnings.

## Activation remains blocked

`ABSTRACT_AI_PRICING_APPROVED_UNTIL` loads from `backend/.env` and is parseable and
future-dated, but is beyond the allowed 30-day approval window. It was not changed.
Set a genuine approved expiry within the next 30 days before activation.

The isolated overrides keep `ABSTRACT_AI_ENABLED`, `ABSTRACT_AI_DATA_APPROVED` and
`ABSTRACT_AI_PRICING_CONFIRMED` false. The AI worker was not started. Email, payments
and bulk communications are disabled in this private setup. Production is unchanged.

## Restart only this isolated setup

From the repository root, in separate terminals:

```powershell
node .private/gemini-e2e-local/run-local.cjs api
npm.cmd --prefix admin run dev -- --mode gemini-local --host 127.0.0.1 --port 5174 --strictPort
```

These commands are for restarting stopped services; do not launch duplicate listeners.
The private API launcher uses the existing configured application with private database
overrides. Do not substitute the normal backend start command, which loads different
database settings. AI activation, worker startup and fictional submission require the
next explicitly approved test step.
