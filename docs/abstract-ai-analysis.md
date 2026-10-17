# Abstract AI classification and advisory assessment

Acceptance update: [the current acceptance report](abstract-ai-acceptance-report.md) records sixteen
passing isolated PostgreSQL scenarios and twenty prepared synthetic evaluation cases. It supersedes
the earlier local PostgreSQL-unavailable limitation below. External model-quality testing remains
unperformed because the dedicated test credential has not been configured.

## Scope and activation boundary

This additive feature analyzes newly submitted or explicitly resubmitted Abstracts for AIAIAC
2027. It preserves the public form, six author-selected tracks, 500-word maximum, deadline,
references, recovery, revision workflow and authoritative human review statuses. It adds no
committee roles, assignments, assessments, payments or decision emails.

The feature is disabled by default. Enabling it requires an explicit feature flag, data-handling
approval flag, supported provider, key, model, prices and positive budgets. Missing/invalid AI
configuration disables only AI; the existing application continues to operate. No historical
backfill is performed. Disabled API instances do not query the new tables.

Do not activate staging or production without the organizer's explicit approval. No migration,
provider request with real submissions, production configuration change or deployment was performed
as part of implementation. Database concurrency and provider quality require the acceptance gates
below before any production activation.

## Data and request flow

Migration `20261014010000000_abstract-ai-analysis.ts` creates only new tables:

| Table | Purpose |
| --- | --- |
| `abstract_ai_jobs` | Durable revision/configuration identity, status, retries and leases |
| `abstract_ai_attempts` | Conservative cost reservations, usage, response ID and outcome |
| `abstract_ai_results` | One validated advisory result per job |
| `abstract_ai_events` | Application append-only queue, attempt, retry and result events |

The submission repository calls an optional enqueue hook inside the existing create/resubmit
transaction. Thus successful enabled submissions have durable jobs; a queue database failure rolls
back the transaction rather than losing the job. The API never calls an AI provider. Existing
post-commit email behavior is untouched. Ordinary draft saves do not enqueue jobs.

Source revision means the existing `SUBMITTED` or `RESUBMITTED` history UUID. That history stores the
title, body and keywords snapshot. Jobs snapshot the draft rubric, its hash, prompt version, requested
model and retry limit. Results cannot change Abstract status. The API adds `aiAnalysis` to existing
Admin list/detail responses and one new protected endpoint:

`POST /api/admin/abstract-submissions/:reference/analysis/retry` with an empty JSON body.

Existing `abstracts.read` controls viewing. Existing `abstracts.review`, session authentication and
mutation protection control retry. The route rate limit is six requests/minute per API instance.
Database state, cooldown and remaining attempts provide shared retry constraints. No roles or
authentication behavior were changed.

The existing Admin pages use the same layout and centralized icon exports. Analysis is visibly
advisory, the rubric is visibly a draft, and human decisions remain separate. Refresh is explicit;
there is no automatic polling. The original conference track is not overwritten by AI categories.

Resubmission with AI enabled marks earlier jobs/results outdated and enqueues the new revision.
Content comparisons also label a result outdated when an author saves a changed draft. Submission
timestamps prevent dispatch/publication of older jobs after a resubmission made while AI was disabled.
Old results remain in the database for audit. Disabling AI hides analysis behind the disabled state;
it does not delete stored results.

## Provider and configuration

Only the explicit `openai` adapter is implemented. There is no fallback provider or default model.
It calls `https://api.openai.com/v1/responses` with `store:false`, a strict JSON schema, no tools and
a bounded timeout/output allowance. Native Node fetch is used; no dependency was added.

Choose and verify a structured-output-capable model in the approved account using synthetic examples.
Prefer an available pinned snapshot. Do not assume an alias exists or will retain its behavior.
Consult [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[pricing](https://developers.openai.com/api/docs/pricing) and
[data controls](https://developers.openai.com/api/docs/guides/your-data) before activation.

Set these **backend-only** variables in the approved environment, not in browser builds:

| Variable | Default / requirement |
| --- | --- |
| `ABSTRACT_AI_ENABLED` | `false`; must be exactly `true` to activate |
| `ABSTRACT_AI_DATA_APPROVED` | `false`; explicit organizer approval of data handling |
| `ABSTRACT_AI_PROVIDER` | Explicit `openai` |
| `ABSTRACT_AI_API_KEY` | Required; dedicated provider project secret |
| `ABSTRACT_AI_MODEL` | Required; verified model identifier |
| `ABSTRACT_AI_INPUT_USD_PER_MILLION` | Required positive current standard input rate |
| `ABSTRACT_AI_OUTPUT_USD_PER_MILLION` | Required positive current output rate |
| `ABSTRACT_AI_DAILY_BUDGET_USD` | Required positive reservation budget; UTC day |
| `ABSTRACT_AI_TOTAL_BUDGET_USD` | Required positive cumulative reservation budget |
| `ABSTRACT_AI_MAX_ATTEMPTS` | `3`, allowed 1–5; snapshotted per job |
| `ABSTRACT_AI_MAX_CONCURRENT` | `1`, allowed 1–4 across database workers |
| `ABSTRACT_AI_REQUESTS_PER_MINUTE` | `6`, allowed 1–60 across database workers |
| `ABSTRACT_AI_TIMEOUT_MS` | `60000`, allowed 1000–120000 |
| `ABSTRACT_AI_MAX_OUTPUT_TOKENS` | `2000`, allowed 500–8000 |
| `ABSTRACT_AI_RUBRIC_JSON` | Optional draft version and weights totaling 100 |

The draft rubric defaults to relevance 30%, clarity 15%, methodology 20%, technical contribution
25% and completeness 10%. Example optional JSON:

```json
{"version":"draft-2","status":"DRAFT","weights":{"relevance":30,"clarity":15,"methodology":20,"contribution":25,"completeness":10}}
```

This phase does not implement an official rubric approval UI. Every rubric remains `DRAFT`.
Changing model/prompt/rubric configuration blocks old queued jobs with `CONFIG_CHANGED`; it does not
silently reanalyze them or create another charge. Operator-reviewed migration of such jobs is outside
this phase. Changing configuration is not a backfill mechanism.

## Worker, failure recovery and costs

Build the backend, then explicitly supervise a separate process:

```text
npm --prefix backend run worker:abstract-ai
```

The worker checks every five seconds, runs at most one request at a time per process and uses
PostgreSQL locks for shared limits. Multiple workers may run only within the configured global cap.
Claims use `SKIP LOCKED`, a global advisory transaction lock for reservations, a unique lease token
and a lease duration of timeout plus 60 seconds. Provider calls run outside database transactions.
Stale worker results cannot replace current results. Outstanding calls for outdated jobs still count
toward concurrency until they finish or their lease expires.

HTTP 429 and 5xx receive bounded exponential retry with jitter. Invalid responses and refusals require
authorized manual retry, with at least a one-minute cooldown and remaining attempts. Automatic and
manual attempts share the same cap; manual retry never resets it. Exhausted jobs stay failed.
Transport errors and expired processing leases are `OUTCOME_UNKNOWN` and are not automatically or
manually retried through the UI: an operator must investigate potential charges. Configuration/input
failures also remain blocked. Human review stays available in every failure state.

Exactly-once billing cannot be guaranteed across a provider success/network loss/database failure.
Unique jobs and result rows prevent duplicate scheduling and publication. Every attempt reserves
its maximum estimated charge before dispatch, even if it later fails. Reservations are never refunded
automatically, so retries and uncertain outcomes cannot escape the configured accounting limit.

Reservation per attempt:

```text
(64000 × configured input rate + max output tokens × configured output rate) / 1000000 USD
```

The 64,000-token input allowance is intentionally conservative: a UTF-8 byte ceiling includes the
content, prompt and schema. Requests exceeding that byte ceiling are rejected before dispatch.
Actual provider input/output usage is recorded for valid responses. Invalid/ambiguous responses may
have no usage record; their full reservations remain. With input $2/M, output $10/M and output cap
2,000, reserve $0.148 per attempt, although a typical 2,000-input/800-output analysis costs about $0.012.
Budget sizing must use reservations, not just expected charges. Price settings must remain accurate;
local budgets cannot account for a provider price increase until configuration is updated. Use provider
project spend controls as a second limit. Do not delete attempt records to reset budgets.

Budget-limited jobs are failed and can be manually requeued after cooldown, once the UTC daily limit
resets or an authorized operator raises an approved budget. Changing budgets does not automatically
release failed jobs. There is no paid analysis of historical abstracts.

Monitor queued age, failed/outdated counts, active leases, attempts and reservation totals using the
AI tables. Logs contain job identifiers and bounded error codes, never abstract content, API keys,
author contacts or provider response bodies. Events record manual retry actors and worker outcomes.
Audit is application append-only; use least-privilege database grants and retention policies to protect
records from direct modification.

## Privacy and security

Provider content is limited to title, body and keywords. Author fields are used locally to redact
known names, organization/job title and contacts embedded in content, then discarded from the payload.
Email/phone patterns are also redacted. Country, author reference, review reasons and history are not
sent. Redaction is best-effort: scientific numbers may match phone patterns, and unknown personal or
confidential research information can remain in the abstract. This is not an anonymization guarantee.
Organizers must approve the research-data transfer policy and author notice before enabling the flag.
Submissions that cannot be shared externally should stay in human-only processing with AI disabled.

`store:false` is not Zero Data Retention. Obtain suitable provider contractual/retention controls for
submitted research, including applicable model exceptions. Do not enable external tools, file storage,
training/data-sharing opt-ins or consumer ChatGPT processing for this workflow.

Untrusted submission text remains data in a separate user message. The prompt tells the model to
ignore embedded instructions. Structured Zod validation rejects extra fields, unknown/duplicate
categories, out-of-range scores, unbounded text and unsupported evidence excerpts. Scores are computed
server-side. Refusal/incomplete/oversized/malformed provider responses cannot become analysis results.
These controls cannot guarantee scientifically correct observations; committee calibration is required.
AI is never given a tool or administrative API credential. Only escaped text is rendered in React.

Use verified database TLS and encrypted disks/backups; protect both source snapshots and AI results.
Define retention for AI records and research before activation. The worker should use separate database
credentials allowed to SELECT needed submission/history fields and read/write only the AI tables;
it should have no UPDATE rights on abstracts, users, registrations or payments. This is an operational
grant recommendation, not a database permission change applied by the migration.

## Safe staging acceptance (requires explicit approval)

1. Review the additive migration and take the usual database backup. Use a dedicated staging database
   containing synthetic submissions only. Confirm destination before any migration command.
2. Deploy/build the API and Admin with AI disabled. Apply reviewed additive migrations to that approved
   staging database before enabling AI. Verify public creation/recovery/revision and human decisions.
3. Configure an approved provider project/model, prices and small budgets in staging only. Keep the
   worker stopped until synthetic acceptance is ready. No production database or actual author data.
4. Enable AI in staging and start the separately supervised worker. Submit synthetic text, confirm one
   job and result, compare explanations against committee-labelled examples, then resubmit and confirm
   new source revision and outdated previous analysis.
5. Exercise concurrent submission retries and multiple worker processes against PostgreSQL. Kill a
   worker after dispatch, expire its lease, and prove no silent paid retry. Verify reservation limits,
   provider outages, invalid responses, exhausted retries and stale completion.
6. Verify each existing role, mutation protection, read-only access, desktop/mobile, light/dark,
   accessibility and all human decision actions. Confirm no AI action sends email or changes status.
7. Record migration/concurrency/provider quality results and committee acceptance before requesting
   production activation. Local SQL-boundary tests are not a substitute for this database test.

## Production activation and rollback (requires separate approval)

After staging gates pass and explicit approval is recorded: back up production, deploy with AI disabled,
apply only the additive migration, verify existing workflows, configure an approved dedicated provider
and conservative limits, enable the API flag and supervise the separate worker. The first rollout
processes only subsequent submissions/resubmissions. Observe job age, failure counts and spending.

To stop AI, stop the worker gracefully, set `ABSTRACT_AI_ENABLED=false` in the approved backend
environment and restart the API. Allow an in-flight bounded call to finish or investigate its reserved
attempt if terminated. Existing Abstract operations continue; queued jobs/results/audit remain stored.
Keep the additive tables when reverting the application release. Do not run migration down in production
as an ordinary rollback: it would remove AI evidence and cost ledgers. Re-enablement requires review of
queued job revisions/configuration and uncertain attempts before restarting processing.

## Local verification evidence

See `output/abstract-ai/` for test/build/lint logs and synthetic UI screenshots. Tests stub the provider;
they never transmit real abstracts. The local Docker daemon was unavailable, so the additive migration
was not applied and real PostgreSQL concurrency/fault tests remain a staging acceptance requirement.
No external model quality benchmark has been run; model suitability must be established with approved
synthetic/committee-labelled examples before production.

Verification results:

- Backend: 327 passed, one existing Windows-inapplicable private-storage permissions test skipped.
  Seventeen focused AI tests are included in that total.
- Admin: 108 passed with `--maxWorkers=2`; eight focused AI component tests also passed separately.
  The initial unrestricted run timed out in two unrelated existing tests; the bounded full rerun passed.
- Public frontend: 78 passed; existing Abstract form/recovery/revision regression tests are included.
- Type checks and production builds passed for backend, public frontend and Admin.
- Frontend lint: zero errors, 12 existing warnings.
- Admin lint: 42 existing formatting errors in unrelated files and eight existing warnings.
  All affected Abstract feature files have zero lint errors; the existing list hook warning remains.
- Synthetic browser QA: 1440px desktop and 390px mobile, light/dark, original human actions and
  outdated-result labels verified. Both page widths matched document widths; the existing list
  scroll container exposes the new AI column on mobile. Scoped AI panel accessibility scans found
  zero violations in light and dark modes. Temporary preview routes were removed.
- Security review checked provider payload minimization, strict output/evidence validation, parameterized
  queries, authorization and mutation boundaries, conservative accounting, no administrative model
  capability, lease/stale-result guards and stable rubric hashing despite PostgreSQL jsonb key ordering.
- Not executed: migration application, real PostgreSQL concurrency/fault injection or external model
  inference/quality evaluation. These are explicit acceptance gates, not claimed passing checks.

## Implementation file manifest

Created:

- `backend/migrations/20261014010000000_abstract-ai-analysis.ts`
- `backend/src/abstracts/analysis.ts`
- `backend/src/abstracts/openaiAnalysis.provider.ts`
- `backend/src/config/abstractAi.ts`
- `backend/src/repositories/abstractAnalysis.repository.ts`
- `backend/src/services/abstractAnalysis.service.ts`
- `backend/src/jobs/abstractAnalysis.job.ts`
- `backend/src/scripts/abstract-analysis-worker.ts`
- `backend/test/abstract-analysis.test.ts`
- `admin/src/services/abstractSubmission/abstractAnalysisTypes.ts`
- `admin/src/pages/admin/abstracts/AbstractAnalysisPanel.tsx`
- `admin/src/test/abstractAnalysis.test.tsx`
- `docs/abstract-ai-analysis.md`

Modified for this feature (some already contained unrelated local changes):

- `backend/src/config/env.ts` (optional AI configuration property only)
- `backend/src/app.ts` (AI repository/controller wiring only)
- `backend/src/repositories/abstractSubmission.repository.ts` (transaction enqueue hooks)
- `backend/src/controllers/abstractSubmission.controller.ts` (Admin analysis projections/retry)
- `backend/src/routes/admin.routes.ts` (new protected retry endpoint)
- `backend/package.json` (worker command only)
- `backend/.env.example` (disabled configuration example only)
- `admin/src/pages/admin/abstracts/AbstractSubmissionsPage.tsx`
- `admin/src/pages/admin/abstracts/AbstractSubmissionDetailPage.tsx`
- `admin/src/services/abstractSubmission/abstractSubmissionAdminService.ts`
- `docs/abstract-submissions.md` (link to this operational guide)

No dependencies, public form changes, authentication policy changes, email-delivery changes,
registration/payment changes or production environment edits were introduced. Generated build output
and local evidence logs/screenshots are separate from source changes. Temporary synthetic browser
preview files were removed after verification.
