# Gemini integration with the existing abstract-review worker

Implemented locally on 2026-10-16. No external Gemini request, author-data processing, production configuration change, database migration or deployment was performed. The feature remains disabled by default.

## Existing workflow reused

Public text submission/resubmission -> existing submission transaction/history/notification/audit event -> existing PostgreSQL AI job -> separately supervised abstract-analysis worker -> shared validation and server-side weighted score -> existing AI result table -> existing authorized Admin detail/list APIs and advisory panel.

The application configuration now explicitly supports `openai` and `gemini`. OpenAI still uses `ABSTRACT_AI_API_KEY`; Gemini uses only `ABSTRACT_AI_GEMINI_API_KEY`. Neither uses the synthetic `GEMINI_API_KEY_TEST` as fallback. If a synthetic test key is present and equals the application key, configuration is rejected. A dedicated application project/key is still an operator responsibility; variable separation cannot prove that a credential was independently issued.

The existing API server queues work only. Only the existing separately started worker constructs a provider and makes inference calls. The official SDK and Gemini adapter are reused. Synthetic CLI settings, journals and existing uncertain synthetic runs are not imported into the application queue.

No changes were made to the evaluation prompt, scoring rubric, structured response schema, Admin layout/icons, human review actions, authentication or role permissions. AI result completion updates only AI tables/events. It never approves, rejects, requests revisions, assigns reviewers, sends decision emails or overwrites reviewer assessments. The existing rubric remains DRAFT.

## Submission-safe enqueue and reconciliation

The existing mandatory ABSTRACT_SUBMITTED/ABSTRACT_RESUBMITTED audit event now includes `details.aiRequestedHistoryId` only when the API has complete, explicitly enabled AI configuration. It contains a revision UUID, not author data or credentials. No new table, column or event type is required.

Optional AI enqueue statements run within a PostgreSQL savepoint. On an AI-table SQL error, only AI writes are rolled back; the submission, history, notification and intent-bearing audit event can commit. A sanitized AI_ENQUEUE_DEFERRED log identifies the submission needing attention. A failure of the shared database/connection or the pre-existing mandatory submission audit path is still a submission/database failure, not something optional AI code can make durable independently.

Before claiming a job, the worker reconciles at most 25 current, explicitly marked revisions using row locks and SKIP LOCKED. It reuses the existing enqueue/unique-key mechanism. Unmarked historical submissions, submissions made while AI was disabled, earlier revisions and final/revision-required decisions are not backfilled. Existing jobs, including failed/uncertain jobs, are not recreated by reconciliation. Reconciliation failures roll back their own transaction, log a fixed code and leave submission data intact; queued work can still be claimed afterward.

## Gemini usage and spending safeguards

The [official pricing table](https://ai.google.dev/gemini-api/docs/pricing), checked 2026-10-16, lists standard paid rates for gemini-3.8-flash and a January 2027 increase. Application reservations conservatively require at least USD 1.50 input / USD 7.50 output per million tokens, even for a free-tier project. Thinking tokens are included in output. This is not a claim that the project is billed at those rates or that future prices can never change.

Gemini activation additionally requires explicit pricing confirmation and a future pricing-review expiry within 30 days. Configuration, provider construction, every claim and the immediate request boundary check pricing validity. There is no online billing/account lookup or inference probe. Operators must verify the actual model/project terms and update conservative rates if necessary; unknown/expired/zero/under-floor pricing disables or pauses Gemini dispatch.

The existing global daily/total ledger reserves a full input/output ceiling before a request. Reservations are not refunded merely because a request failed or usage is unknown. Gemini input has a conservative serialized-byte limit plus overhead allowance. Automatic SDK retries remain disabled, no tools are supplied, output is capped and timeout bounded.

Application Gemini responses require prompt/candidate/total usage, consistent totals including thoughts, cache counts within input counts, an exact verified model version and counts within reserved ceilings. Missing/contradictory/out-of-bound usage fails with USAGE_UNVERIFIED; no assessment is stored. Known validated usage is retained when content validation fails. Raw provider bodies, auth headers and keys are never written to application logs or diagnostic events.

HTTP 503, transport failures and timeouts remain OUTCOME_UNKNOWN and are not automatically retried. Safe HTTP categories are recorded in existing AI audit events, e.g. HTTP_503_SERVER_ERROR. Configuration errors also remain non-retryable. Existing bounded HTTP 429 retry semantics are retained, but missing usage can trigger the stricter application-wide accounting pause below.

Under the shared PostgreSQL claim lock, a finished Gemini attempt for this model with unknown usage, OUTCOME_UNKNOWN or USAGE_UNVERIFIED pauses further Gemini dispatch. Other abstracts remain queued and human review continues. Expired leases also become uncertain and trigger the pause. This does not retroactively cancel requests already in flight, so initial activation should use concurrency 1. Known input/output totals cannot be replaced with zero to clear the pause. There is no automatic reset or retry of an uncertain attempt. Operator usage/billing investigation and separately approved audited recovery are required; do not delete ledger rows, remove reservations or force uncertain jobs back to QUEUED.

## Configuration steps, not performed

In a separately approved isolated application/staging environment:

1. Verify the existing abstract AI migrations are already applied to that isolated database. This change adds no schema migration.
2. Issue a dedicated backend application Gemini key. Do not reuse test keys, expose VITE_ variables, commit credentials or send author information as metadata.
3. Verify project/model access, current rates, quotas and data-handling terms. Google's Free Tier can use submitted content to improve its products; data approval must explicitly cover confidential research handling, not simply free-tier eligibility.
4. Configure the following backend-only settings. Keep ENABLED/DATA_APPROVED false until authorized. Keep existing OpenAI settings for OpenAI use.

```dotenv
ABSTRACT_AI_ENABLED=false
ABSTRACT_AI_DATA_APPROVED=false
ABSTRACT_AI_PROVIDER=gemini
ABSTRACT_AI_GEMINI_API_KEY=
ABSTRACT_AI_MODEL=gemini-3.8-flash
ABSTRACT_AI_PRICING_CONFIRMED=false
ABSTRACT_AI_PRICING_APPROVED_UNTIL=
ABSTRACT_AI_INPUT_USD_PER_MILLION=1.50
ABSTRACT_AI_OUTPUT_USD_PER_MILLION=7.50
ABSTRACT_AI_DAILY_BUDGET_USD=
ABSTRACT_AI_TOTAL_BUDGET_USD=
ABSTRACT_AI_MAX_ATTEMPTS=1
ABSTRACT_AI_MAX_CONCURRENT=1
ABSTRACT_AI_REQUESTS_PER_MINUTE=1
ABSTRACT_AI_TIMEOUT_MS=60000
ABSTRACT_AI_MAX_OUTPUT_TOKENS=4096
```

Pricing expiry should be an ISO UTC timestamp reviewed by the operator, not an automatically extended value. Budgets must be explicit positive limits. The checked-in .env.example contains no key and keeps activation/data/pricing flags false. No real environment file was changed.

5. Approve the review rubric/policy and pilot access separately. The existing permission boundary remains SUPER_ADMIN/ADMIN review and other explicitly permitted read access; no new Scientific Committee role or assignment system was introduced.
6. After activation approval, restart the API with the same approved configuration and supervise the existing `npm --prefix backend run worker:abstract-ai` process from a backend production build. Starting the API alone does not start inference. Monitor queue age, reconciliation errors, budget/usage pauses and provider diagnostics. These steps were not executed.

## Changed files

- backend/src/config/abstractAi.ts: provider selection, dedicated key and pricing guards.
- backend/src/abstracts/analysisProvider.factory.ts: shared application provider factory.
- backend/src/abstracts/geminiAnalysis.provider.ts: reusable factory/options and opt-in strict application usage validation; synthetic behavior retained.
- backend/src/abstracts/enqueueAnalysis.ts: optional SQL savepoint isolation.
- backend/src/repositories/abstractSubmission.repository.ts: existing audit-event intent and safe enqueue on submit/resubmit.
- backend/src/repositories/abstractAnalysis.repository.ts: bounded reconciliation, safe accounting checks/dispatch pause and diagnostic audit events.
- backend/src/services/abstractAnalysis.service.ts: reconciliation and failure usage/diagnostic propagation.
- backend/src/scripts/abstract-analysis-worker.ts: factory wiring in the existing worker.
- backend/.env.example: disabled backend configuration placeholders only.
- backend/test/abstract-gemini.integration.test.ts: application-flow mocks and negative-path checks.
- Existing analysis tests: savepoint-aware assertions and explicit OpenAI provider in the local acceptance fixture.

## Activation blockers

No external application credential/model/quota/billing availability has been tested. Synthetic S01/S04 successes are not application-pilot approval. Confidential-research data policy and committee rubric approval remain operator decisions. The initial real-PostgreSQL attempt was permission-blocked. A later explicitly authorized local run successfully verified 8 Gemini workflow scenarios and 16 queue/reliability regressions against the dedicated PostgreSQL cluster; see [the PostgreSQL verification report](gemini-postgres-workflow-report.md). That database verification blocker is cleared. An approved usage-pause recovery procedure is still required before safe activation. No production data or credentials were used to work around that limitation.


## Local verification results

- 15 new mocked application integration tests passed: configuration/key isolation, pricing approval/expiry, public submission, worker selection, minimized provider payload, stored results/usage, protected Admin visibility, enqueue SQL failure/savepoint recovery, single reconciliation, revisions, unmarked/disabled submissions, final human decisions, HTTP 503, network failure, timeout, missing/inconsistent/excess usage, invalid administrative output and insufficient budget.
- Affected suites: 126 passed, 0 failed.
- Full backend regression: 436 passed, 0 failed, 1 Windows-specific private-storage permissions test skipped.
- Existing Admin advisory panel: 8 passed, 0 failed.
- Backend, public frontend and Admin TypeScript checks and production builds passed locally. No deployment occurred.
- Changed backend files passed the 100-column Prettier check. Frontend lint: 0 errors, 12 existing warnings. No backend ESLint command is configured.
- Real PostgreSQL integration verification: NOT PERFORMED for this change. Automatic approval review rejected starting the existing isolated cluster; status was checked afterward and it remained stopped. Mocked tests are not presented as real-database verification.
- No external model evaluation, inference, credential validity, provider availability or account billing/quota checks were performed.

Evidence logs: `output/gemini-evaluation/worker-integration-tests.log` (initial focused run), `worker-affected-tests.log`, `worker-backend-regression.log`, `worker-backend-build.log`, `worker-public-checks.log`, `worker-admin-checks.log`, `worker-admin-panel-tests.log`. Backend TypeScript and changed-file formatting also passed directly in the terminal.


## Subsequent real-PostgreSQL verification

The prior NOT PERFORMED entry above records the initial attempt only. It is superseded by the successful isolated test run documented in [gemini-postgres-workflow-report.md](gemini-postgres-workflow-report.md): 8 Gemini workflow scenarios and 16 existing queue/reliability scenarios passed, zero failed. The cluster was stopped afterward. No external inference or production change occurred.
