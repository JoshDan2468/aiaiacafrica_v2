# Isolated Gemini synthetic evaluation

Implemented 2026-10-16. External execution has **not** been performed or approved.

## Scope and files

- `backend/src/abstracts/analysisProvider.ts`: shared provider interface, safe error type, unchanged evaluation instructions. OpenAI retains backward-compatible exports and its original request behavior.
- `backend/src/abstracts/geminiAnalysis.provider.ts`: official `@google/genai` SDK 2.30.0 adapter, strict existing Zod/evidence validation, existing server-computed advisory score.
- `backend/src/abstracts/geminiSyntheticEvaluation.ts`: standalone, sequential, fixed-fixture runner and local comparison journal.
- `backend/src/scripts/evaluate-gemini-synthetic.ts`: explicitly gated command entry point.
- `backend/test/gemini-evaluation.test.ts`: mocked adapter, SDK transport and runner checks.
- `backend/package.json` / lock: pinned SDK and `eval:gemini:synthetic` command.
- `backend/src/services/abstractAnalysis.service.ts`: provider-neutral import only.

No database, production worker, Admin, registration, production configuration or deployment integration was added. The runner does not import the application, database or dotenv loader. Gemini is not selectable through the live worker. Human decisions and submission statuses cannot be changed by this runner.

## Model verification

The exact ID `gemini-3.8-flash` was checked against Google's [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) and [pricing table](https://ai.google.dev/gemini-api/docs/pricing) on 2026-10-16. The documentation lists structured outputs and free-tier input/output for that model. The runner requires this literal ID; it has no model default or substitution. The [official SDK](https://github.com/googleapis/js-genai) is used.

Published eligibility does not verify this user's project, country, quota or billing tier. No authenticated model listing or inference request was made. Confirm the dedicated project's Free Tier in Google AI Studio before setting the confirmation flag. Recheck the official pages before execution; account quotas and terms may change. Free-tier content can be used to improve Google's products: only the existing synthetic fixtures may be sent. Do not reuse the test key for live submissions.

## Required configuration and first-case command

After approval, configure a dedicated test key in the current backend terminal as `GEMINI_API_KEY_TEST`. Do not paste its value into chat, commit it, put it in frontend environment variables, or pass it as a command argument. This runner never reads `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, production environment files or production credentials as fallback.

From the repository root in PowerShell, with the test key already injected securely:

```powershell
$env:NODE_ENV = "test"
$env:GEMINI_MODEL_TEST = "gemini-3.8-flash"
$env:GEMINI_TEST_FREE_TIER_CONFIRMED = "true"
$env:GEMINI_TEST_ALLOW_EXTERNAL = "true"
npm --prefix backend run eval:gemini:synthetic -- --execute --case S01 --run gemini-s01-first
```

All of `GEMINI_API_KEY_TEST`, `GEMINI_MODEL_TEST`, `NODE_ENV=test`, both confirmation flags, and `--execute` are required. They have not been enabled by this implementation. The free-tier flag is a manual project confirmation, not an automatic billing guarantee.

Optional bounded settings:

| Variable | Default | Bounds |
| --- | --- | --- |
| `GEMINI_TEST_TIMEOUT_MS` | 60000 | 1000-120000 |
| `GEMINI_TEST_MAX_OUTPUT_TOKENS` | 4096 | 1000-8000 |
| `GEMINI_TEST_INTERVAL_MS` | 15000 | 1000-60000 |
| `GEMINI_TEST_MAX_ATTEMPTS` | 1 | 1-2 |

Only after reviewing S01, a separate approved full run can use `--all --run gemini-all-first` in place of `--case S01 --run gemini-s01-first`. This full run includes S01 again and therefore represents an intentional additional request. Do not run it now. Clear `GEMINI_TEST_ALLOW_EXTERNAL` after use.

## Evaluation and reliability

Only `backend/test/fixtures/abstract-ai-synthetic.json` is accepted: 20 uniquely identified cases S01-S20, pinned by a normalized SHA-256 digest. No arbitrary input file, submission API, live author data or database connection is supported. Existing fixtures are short (approximately 142-159 words), so this set does not establish performance for full 500-word submissions.

The report compares category sets, expected weighted-score ranges and each criterion's range. It preserves each fixture's expected summary facts, issues and forbidden claims alongside the output for human review. Summary correctness, unsupported claims and omissions require human judgment; one run cannot establish score consistency. No model-quality conclusions are claimed from mocked tests. The rubric remains the existing DRAFT and needs committee approval.

Requests are sequential and output-limited, with a 60-second default timeout and LOW thinking. SDK retries are disabled (`attempts: 1`). Only an explicit second attempt can retry HTTP 429, waiting at least 60 seconds. Exhausted quota/configuration failures stop the batch. Transport errors, timeouts and server failures stop with an uncertain outcome and are never automatically retried. Blocked, truncated or malformed outputs are recorded as failures rather than fabricated evaluations. Zod rejects unexpected fields (including administrative decisions), invalid categories, scores and non-verbatim evidence.

Local results are saved at `output/gemini-evaluation/runs/<run>/results.json`. The journal records dispatch before the request, response IDs, model versions, known input/output/thought/cache tokens and unknown usage attempts. It does not save keys, SDK raw errors or personal data. Exact key strings are redacted defensively. Output-token totals include thinking tokens. Local OS permissions still apply; Windows mode flags are not a replacement for ACLs. Keep generated output out of commits.

An exclusive `run.lock` prevents concurrent execution using the same run ID. Repeating a completed/failed run ID never dispatches another request. A process crash can leave the lock: inspect the journal and provider usage manually before removing it. A dispatch without a recorded result becomes `HALTED_UNCERTAIN` on recovery; it is not repeated. A new run ID intentionally permits new requests, so the journal cannot prevent manual duplication across different run IDs. No provider-side exactly-once guarantee is claimed.

## Usage and remaining risks

The documented Free Tier has zero input/output price within eligible quota; project eligibility must be confirmed separately. Default S01 permits one request and a 4096-output-token cap; all 20 permit at most 20 requests / 81,920 output tokens. Opting into two attempts permits up to 40 dispatches across a full batch (only quota errors retry). Input size includes instructions and schema, so actual input usage must be read from results. Unknown outcomes can have provider-side usage despite no returned token totals. No external token counts or costs have been measured.

This is an isolated test harness, not production readiness approval. External quality evaluation, human narrative review, repeated-run consistency assessment, account/model access and quota validation remain outstanding. Production AI remains subject to its existing disabled gates.


## Local implementation verification

| Check | Result |
| --- | --- |
| Backend regression suite (including 21 Gemini mocked tests) | 370 passed, 0 failed, 1 platform-specific private-storage permission/symlink test skipped on Windows |
| All 20 fixtures through mocked sequential runner | Passed; not external quality evidence |
| SDK success and HTTP 429 with intercepted fetch | Passed, no external inference |
| Blocked, malformed, invalid evidence/admin fields, missing usage, timeout | Passed |
| Same-run concurrency lock, quota attempt cap, uncertain crash journal, redaction | Passed |
| Missing opt-in CLI smoke test | Exited 1 before any request, as required |
| Public frontend tests, one worker | 78 passed |
| Admin tests, one worker | 108 passed |
| Backend/public/Admin TypeScript | Passed |
| Backend/public/Admin production builds | Passed locally, no deployment |
| Backend changed-file Prettier check (100 columns) | Passed; no backend ESLint script is configured |
| Public lint | 0 errors, 12 existing warnings |
| Admin lint | Existing 42 errors, 8 warnings; no Admin files changed |
| npm dependency audit | Same 3 advisories as baseline (1 moderate, 1 high, 1 critical); no new advisories or changed existing package versions |
| External model quality / actual token costs / project eligibility | Not performed |

The first resource-heavy parallel UI runs had timeouts (public: three failures; Admin: one). Full one-worker reruns passed without UI changes. A Windows file-lock failure during atomic report replacement was fixed with bounded local-filesystem retries; the final full backend run passed. Exhausting journal-write retries still aborts execution rather than repeating a request.

Evidence logs are in `output/gemini-evaluation/`: `backend-tests-final.log`, `backend-types.log`, `backend-build.log`, `backend-format.log`, `frontend-tests-serial.log`, `admin-tests-serial.log`, `lint.log`, `disabled-smoke.log`, plus pre/post npm audit JSON. These are local verification artifacts, not Gemini evaluation results. No external execution is authorized by these passing checks.


## Safe HTTP diagnostics (2026-10-16)

Future failed attempts may include `diagnostics: { httpStatus, category }` in the local journal. Only integer error statuses 400-599 (or null) and fixed labels are accepted. The mapping is 400 BAD_REQUEST, 401 UNAUTHENTICATED, 403 PERMISSION_DENIED, 404 NOT_FOUND, 429 RATE_LIMITED, 5xx SERVER_ERROR, and other 4xx HTTP_ERROR. Missing, invalid and local timeout statuses use MISSING_HTTP_STATUS, INVALID_HTTP_STATUS and TIMEOUT respectively. These labels describe the error class, not its exact underlying cause. Numeric three-digit strings are normalized; objects are never coerced and status getters are not invoked.

No messages, headers, response bodies or request content are copied into diagnostics. The journal independently validates diagnostic fields and rejects unknown fields/categories. Configuration errors remain non-retryable and stop the run; existing retry/timeout limits and all evaluation rules remain unchanged. Older journals without diagnostics remain readable and are not rewritten by this change.

The original `gemini-s04-first` journal records PROVIDER_CONFIGURATION, one attempt, null usage/result/comparison and timestamps. It contains no HTTP status or finer safe diagnostic information. Its exact original HTTP status/cause cannot be recovered from that journal; this implementation makes no new request and does not alter the historical record.


Diagnostic-change verification: 93 affected tests passed, including SDK transport mocks for HTTP 400/401/403/404, each mapped HTTP class, missing/malformed status values, sensitive-data exclusion, journal validation and unchanged no-retry behavior. Full backend regression: 403 passed, 0 failed, 1 Windows-specific test skipped. Backend and public frontend TypeScript/build checks passed. Changed-file Prettier passed; frontend lint has 0 errors and the existing 12 warnings. No backend ESLint script is configured. No real API requests were made. The historical S04 journal is byte-for-byte unchanged (SHA-256 `eefd103ab843f3d9483b39df596e3cb7cc4082d19da00953cec7a170a720ba0c`). Verification logs: `output/gemini-evaluation/diagnostic-tests.log`, `diagnostic-backend-regression.log`, `diagnostic-backend-checks.log`, `diagnostic-frontend-checks.log`.


## Explicit subset selection and dry runs (2026-10-16)

`--cases` accepts a comma-separated nonempty list of existing fixture IDs. IDs are case-sensitive; whitespace around each list item is trimmed. Unknown IDs, empty items, duplicates (including after trimming), repeated flags and conflicting `--case`/`--cases`/`--all` selections are rejected. Supplied order is preserved. Exactly one of `--execute` and `--dry-run` is required.

Dry run from the repository root (no credentials, provider construction, journal or external requests):

```powershell
npm.cmd --prefix backend run eval:gemini:synthetic -- --dry-run --cases "S02,S03,S05,S06,S07,S08,S09,S10,S11,S12,S13,S14,S15,S16,S17,S18,S19,S20" --run gemini-remaining18
```

It reports the exact selected IDs, caseCount 18, externalRequests 0 and journalCreated false. This verifies fixture selection only; it does not prove credential validity, account quota or model access.

Controlled execution command, **only after explicit external-batch approval**, from the repository root in the terminal containing the dedicated test key:

```powershell
$env:NODE_ENV = "test"
$env:GEMINI_MODEL_TEST = "gemini-3.8-flash"
# Confirm project free-tier eligibility before setting this attestation.
$env:GEMINI_TEST_FREE_TIER_CONFIRMED = "true"
$env:GEMINI_TEST_ALLOW_EXTERNAL = "true"
$env:GEMINI_TEST_MAX_ATTEMPTS = "1"
$env:GEMINI_TEST_INTERVAL_MS = "60000"
$env:GEMINI_TEST_TIMEOUT_MS = "60000"
$env:GEMINI_TEST_MAX_OUTPUT_TOKENS = "4096"
npm.cmd --prefix backend run eval:gemini:synthetic -- --execute --cases "S02,S03,S05,S06,S07,S08,S09,S10,S11,S12,S13,S14,S15,S16,S17,S18,S19,S20" --run gemini-remaining18
```

Maximum 18 dispatched requests, zero retries, at least 60 seconds between completed attempts and subsequent dispatches. Output cap totals 73,728 tokens; this is a cap, not an estimate of measured usage. A failure can halt the batch early. SDK retry, quota/error handling, locks and journals are unchanged. No Gemini provider/model/prompt/rubric/schema changes were made for subset support.

Results are saved to `output/gemini-evaluation/runs/gemini-remaining18/results.json`; inspect per-case status, attempts, diagnostics, comparisons and usage. A completed result may still fail expected-category/score comparisons: completion is not a quality pass.

On interruption, preserve the journal and lock. Establish that the original process has stopped before considering removal of a stale lock. Do not delete the journal or use a fresh run ID to repeat completed, failed or DISPATCHED/OUTCOME_UNKNOWN attempts. A recorded dispatch without a terminal outcome is uncertain; the existing recovery logic marks it HALTED_UNCERTAIN without retry if the same configuration is inspected through the runner after a stale lock is safely cleared. The runner does not automatically resume partial runs. Reusing an existing non-PREPARED run returns its saved record without new dispatches. Changing the case list/order under the same run ID is rejected. For continuation, manually review and select only cases with NOT_RUN status and no attempts, then obtain approval for a new run ID and explicit `--cases` list. Ambiguous attempts require separate provider-usage investigation, not automatic retry.


Subset implementation checks: 111 affected tests passed; full backend regression 421 passed, 0 failed, 1 Windows-specific test skipped. Backend/public frontend TypeScript and builds passed. Changed-file Prettier passed; public lint has 0 errors and the existing 12 warnings. The actual dry-run command selected the exact 18 requested IDs, reported zero external requests and created no run directory. No external batch was executed. Local logs: `output/gemini-evaluation/cases-tests.log`, `cases-backend-regression.log`, `cases-backend-checks.log`, `cases-frontend-checks.log`, `cases-dry-run.log`.
