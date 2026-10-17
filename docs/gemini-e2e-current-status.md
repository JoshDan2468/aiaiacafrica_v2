# Gemini local end-to-end status — 2026-10-16

## Passed

- Private PostgreSQL application database identity verified: `aiaiac_gemini_e2e_local`,
  loopback port 55437; zero abstracts, jobs and attempts. Application API port 5057.
- Local Admin proxy, fictional viewer authentication and abstract listing returned 200.
  User management, payments and review mutation returned 403 for the read-only viewer.
- 8 real PostgreSQL workflow scenarios passed again in the separate guarded acceptance
  database `aiaiac_ai_acceptance`, using fictional data and mocked Gemini SDK output.
  Submission, job creation, worker, results, Admin retrieval, enqueue failure/reconciliation,
  revisions, HTTP 503 uncertainty, budget/usage guards and decision preservation passed.
- 16 mocked backend integration/permission tests passed.
- 8 public abstract component tests and 8 Admin analysis component tests passed.
- Browser opened the real local Admin login. Screenshot:
  `output/gemini-e2e-local/admin-login-browser.png`. This is login-page evidence only.

## Pricing correction

Original effective value from `backend/.env`: `2026-11-15T23:59:59Z`.
At inspection (`2026-10-16T20:22:40Z`) it was about 30.151 days ahead: the exact
30-day guard rejected the extra 3.6 hours. It was not a parsing failure.

Official https://ai.google.dev/gemini-api/docs/pricing was reviewed: Gemini 3.8 Flash
standard input/output are free on the Free tier; paid rates are $0.75/$3.75 per million
through December 2026 and $1.50/$7.50 from January 2027. Existing minimum application
reservation rates remain conservative. This does not verify project quota or billing.

User-authorized private local override now expires `2026-10-23T20:23:02.338Z` and
passes the guard. `backend/.env` was not edited. AI enablement, pricing confirmation
and data approval remain false. The running API predates this change and needs a
permitted restart to load it; the read-only launcher check used the new configuration.

## Failed configuration / corrected preparation

The ordinary public development mode targets the remote API. It must not be used for
this test. Prepared ignored `frontend/.env.gemini-local`, matching the Admin test mode:
empty `VITE_API_URL`, `API_PROXY_TARGET=http://127.0.0.1:5057`. No credentials present.
Use mode `gemini-local` and browser origin `http://localhost:5173`; the API allows that
origin. Admin uses `http://localhost:5174`. The 127.0.0.1 browser origin remains disallowed.

## Blocked by execution permissions

The earlier command to launch the isolated public frontend was rejected by Codex's
automatic execution policy before process creation. No application error/stack trace
was produced and port 5173 is not listening. This restriction was not bypassed or retried
through another process-launch route.

Consequently no browser author submission, browser worker-to-panel sequence or complete
human review workflow has passed. The viewer intentionally cannot make review decisions;
a separate fictional existing owner account can exercise human review when authorized.
Component and HTTP tests must not be reported as a completed browser end-to-end test.

## Next actions and approval

An operator must start the public frontend in the prepared mode and permit a local API
restart through the normal execution controls. Once available, complete the fictional
browser submission/reviewer workflow with a mock-only provider before the real call.

Before one real request, obtain explicit approval to temporarily enable the three private
local AI/data/pricing flags for fictional data only, use the dedicated application key and
verified model, agree an explicit budget, and start the existing worker with one attempt,
one concurrent job and no uncertain-outcome retry. Restore disabled flags afterward.
The current false flags were not changed. No live inference, paid billing activation,
production connection or deployment occurred.
