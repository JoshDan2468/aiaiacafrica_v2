# Local PostgreSQL Gemini workflow verification

**Result: PASS — 8 Gemini workflow scenarios and 16 existing queue/reliability regression scenarios; zero failures.** Gemini run ID `mvb98icr`; regression run ID `mvb98sl6`. This supersedes the earlier permission-blocked real-database verification limitation.

## Database isolation

Docker CLI is installed, but the Docker engine is unavailable. The general `compose.yaml` uses deployment configuration and persistent volumes and was not started. A dedicated PostgreSQL 18 cluster already existed under `.private/abstract-ai-acceptance-20261014/cluster`; it was stopped before testing. Its normal native startup succeeded this time, bound only to `127.0.0.1:55437`.

The new guarded `backend/test/abstract-gemini.acceptance.ts` pins database `aiaiac_ai_acceptance`, local role `aiaiac_ai_test`, an explicit empty password for the existing loopback-only test setup, and SSL disabled for that test endpoint. It does not use DATABASE_URL or application/provider credentials. Before migration, it verifies the exact data directory, current database/user, listen address and port. An explicit AIAIAC_GEMINI_PG_ACCEPTANCE_LOCAL=true flag is required.

The three existing authentication prerequisite, abstract-submission and abstract-AI migrations applied successfully to newly named test schemas only. No production/shared database was connected, reset or migrated. No schema drop or truncation was used. Previous regression evidence was copied aside before refreshing it. Test-only data/schemas are retained locally; the server was stopped after tests and its stopped status was confirmed.

## Pass/fail matrix

| Check | Result |
| --- | --- |
| Public HTTP abstract submission and persisted data | PASS |
| Automatic job creation before provider execution | PASS |
| Application Gemini factory, existing worker service and stored advisory result | PASS |
| Input/output accounting, including thinking tokens and budget reservation | PASS |
| Existing Admin detail retrieval; unauthenticated/read-permission checks | PASS |
| Real PostgreSQL enqueue statement failure preserves submission and durable intent | PASS |
| Concurrent reconciliation creates exactly one job | PASS |
| Revision/resubmission, resubmission enqueue failure, reconciliation and prior results | PASS |
| HTTP 503 retains OUTCOME_UNKNOWN, null usage, reservation and safe diagnostic event | PASS |
| Uncertain outcomes prevent retry and further dispatch | PASS |
| Missing usage fails closed | PASS |
| Human ACCEPTED/REJECTED/REVISION_REQUIRED decisions, notes/history and notifications unchanged | PASS |
| Disabled/unmarked submissions are not backfilled | PASS |
| Insufficient budget prevents provider execution | PASS |
| Existing real-PG concurrency, duplicate prevention, crashes/leases, rate limits and stale-result regression suite | PASS — 16 scenarios |

The Gemini tests inject an in-memory SDK client through the application factory and use hand-authored responses. Global fetch is blocked in that test process. Author data is fictional, mail is mocked, HTTP is local loopback only, and external Gemini requests are zero. Admin test identities are injected in the test authentication boundary; production authentication and permission code are unchanged. This is application workflow/reliability verification, not external model-quality or real credential verification.

Backend TypeScript checks, backend build and formatting check for the new test script passed. No application implementation or production configuration change was needed to obtain these passes.

## Evidence

- `output/gemini-postgres-workflow/results.json`: eight Gemini scenario results.
- `output/gemini-evaluation/real-postgres-gemini-workflow.log`: execution log.
- `output/abstract-ai-acceptance/database-results.json`: sixteen regression scenario results.
- `output/gemini-evaluation/real-postgres-queue-regression.log`: regression execution log.

## Remaining activation requirements

The real-PostgreSQL verification blocker is cleared. Dedicated application credentials, provider/model availability and quotas, current approved pricing/budgets, confidential-research data handling, committee rubric/policy approval, and an approved audited recovery procedure for uncertain usage remain required before activation. The previous external 503 observations are not resolved by mocked-provider success. No external inference or billing/account checks were made, and production AI was not enabled or deployed.
