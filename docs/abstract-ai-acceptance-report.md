# AIAIAC 2027 AI Abstract Review — Acceptance report

**Decision:** database reliability and UI acceptance pass. The feature is suitable for an isolated, synthetic-data reliability pilot after approval. External model-quality acceptance is incomplete; do not activate an external-AI staging pilot until a dedicated test credential, model and evaluation budget are approved. Production remains out of scope and disabled by default.

## Scope and isolation

Docker's engine was unavailable. PostgreSQL 18.6 was found at `C:/Program Files/PostgreSQL/18/bin`, so a new cluster was initialized in `.private/abstract-ai-acceptance-20261014/cluster`. It listened only on `127.0.0.1:55437`, using a synthetic local role and database `aiaiac_ai_acceptance`. The test verifies `SHOW data_directory` before any migration. No existing database, production credential, production setting or real submission was used.

Three actual migrations were applied to fresh per-scenario schemas: Admin authentication prerequisites, Abstract submissions and the additive Abstract AI migration. No migration down, database drop or truncation was run. The test-only PostgreSQL server was stopped afterward; synthetic data is retained locally for inspection. The application AI feature flags were never enabled. Tests instantiate the repository/service directly with synthetic configuration and stub providers.

The user confirmed that `OPENAI_API_KEY_TEST` has not been configured and instructed that model-quality testing remain unperformed. No external AI inference request was made. Local HTTP timeout traffic was sent only to a temporary loopback test server. Documentation/pricing lookup did not transmit submission content.

## Database and worker results

Run identifier: `mv7ojefk`. **16 scenarios passed, zero failed.**

| Acceptance scenario | Result |
| --- | --- |
| Actual migrations apply to a fresh isolated schema without historical backfill | PASS |
| Twelve concurrent submission retries persist exactly one submission, job, history and notification | PASS |
| Sixteen concurrent claimers respect global cap of four and never double claim a job | PASS |
| Concurrent duplicate enqueue calls preserve one unique job | PASS |
| Killed worker after synthetic provider dispatch retains reservation and fails uncertain without repeated dispatch | PASS |
| Real local HTTP timeout becomes uncertain and cannot trigger a second paid attempt | PASS |
| Provider outage retries with cooldown, recovers, and leaves submission successful | PASS |
| Retry exhaustion and manual retries share the same attempt cap | PASS |
| Malformed result stays failed; authorized cooldown retry records the actor and can recover | PASS |
| Human acceptance, rejection and revision decisions remain unchanged after successful analysis | PASS |
| Resubmission during analysis discards the late result and queues one new source revision | PASS |
| Daily and total budget reservations prevent excess dispatch | PASS |
| Shared per-minute dispatch limit is enforced across simultaneous callers | PASS |
| Public HTTP submission completes before a failed AI provider request and remains retrievable | PASS |
| Changed configuration blocks old jobs without provider calls or reservations | PASS |
| All twenty synthetic abstracts persist through the existing workflow without external inference | PASS |

Evidence: [structured database results](../output/abstract-ai-acceptance/database-results.json), [execution log](../output/abstract-ai-acceptance/database-log.txt), and [repeatable local test](../backend/test/abstract-analysis.acceptance.ts).

The concurrency test used real independent PostgreSQL transactions and sixteen simultaneous claimers against eight jobs, with a shared cap of four. Two waves produced eight unique results. The crash test terminated a separate worker process after its synthetic provider-dispatch signal; lease expiry was advanced in the isolated schema to test uncertain-outcome recovery without waiting a minute. Cooldowns and retry dates were also advanced only in test schemas after first proving that immediate retry was denied. The local HTTP timeout used a real fetch abort against a delayed loopback server.

An initial acceptance run failed one recovery check because its hand-authored stub mistakenly included the backend-calculated advisoryScore in the provider response. Strict validation correctly rejected that extra property. The stub was corrected; no production implementation change was required. The final full database rerun passed all sixteen scenarios. The initial log is retained separately for transparency.

## Synthetic evaluation corpus

Twenty unique, invented conference abstracts were prepared (142–159 words). They cover all four categories, two-category combinations, a four-category demonstrator, incomplete proposals, a deterministic digital-monitoring counterexample, an out-of-scope control and embedded prompt-injection text. All twenty were saved through the existing Abstract service with one queued job each and zero inference attempts. The existing 500/501-word validation regression also remains covered by automated tests. The corpus consists of short abstracts; the later model pilot should add near-500-word and multilingual/style-variation cases.

Each case has expected categories, summary facts, five criterion intervals, a weighted-score interval, limitations/missing information and prohibited unsupported claims. These expectations are draft reviewer guidance, not committee-approved standards.

Read [all twenty abstracts and expectations](../output/abstract-ai-acceptance/synthetic-abstracts-and-expectations.md) or [machine-readable fixtures](../backend/test/fixtures/abstract-ai-synthetic.json).

| Case | Expected categories | Expected draft total | Observed model outcome |
| --- | --- | --- | --- |
| S01 | Artificial Intelligence | 75–95 | UNPERFORMED |
| S02 | Artificial Intelligence | 70–95 | UNPERFORMED |
| S03 | Artificial Intelligence | 25–60 | UNPERFORMED |
| S04 | Automation | 75–95 | UNPERFORMED |
| S05 | Automation | 70–95 | UNPERFORMED |
| S06 | Automation, Asset Integrity | 70–95 | UNPERFORMED |
| S07 | Cybersecurity | 75–95 | UNPERFORMED |
| S08 | Artificial Intelligence, Cybersecurity | 70–95 | UNPERFORMED |
| S09 | Cybersecurity | 25–60 | UNPERFORMED |
| S10 | Asset Integrity | 75–95 | UNPERFORMED |
| S11 | Asset Integrity | 65–90 | UNPERFORMED |
| S12 | Asset Integrity | 20–55 | UNPERFORMED |
| S13 | Artificial Intelligence, Asset Integrity | 75–95 | UNPERFORMED |
| S14 | Artificial Intelligence, Automation | 70–95 | UNPERFORMED |
| S15 | Automation, Cybersecurity | 75–95 | UNPERFORMED |
| S16 | Cybersecurity, Asset Integrity | 70–95 | UNPERFORMED |
| S17 | Artificial Intelligence, Automation, Cybersecurity, Asset Integrity | 60–90 | UNPERFORMED |
| S18 | Asset Integrity | 60–85 | UNPERFORMED |
| S19 | None: out of scope | 15–50 | UNPERFORMED |
| S20 | Cybersecurity | 55–85 | UNPERFORMED |

**No model accuracy, summary fidelity, score consistency or hallucination rate is claimed.** Twenty-two corpus tests passed, proving input limits, coverage, reference-schema validity and draft arithmetic only. They are not a substitute for evaluating returned model responses. [External-model result ledger](../output/abstract-ai-acceptance/external-model-results.json) records null observations for every case.

## Incorrect classifications, scores and unsupported claims

The schema probe deliberately supplied the wrong allowed category and an unsupported narrative claim for a synthetic logistics abstract. Both could pass structural validation when evidence excerpts were otherwise valid. An invented evidence excerpt was rejected. This demonstrates a semantic limitation: allowed-enum validation and excerpt matching cannot prove that a category, summary, explanation or score is scientifically justified. This is a controlled adversarial test, not an observed failure of an external model.

The expected oracle identifies incomplete methodology/results in S03, S09 and S12; synthetic-data limitations in the research cases; false AI attribution risks in S04/S05/S18; out-of-scope misclassification in S19; and instruction-following/score-inflation risks in S20. Actual OpenAI errors and repeated-score variance remain unknown.

For the external pilot, freeze model/prompt/rubric, run each case at least three times, record token usage and refusals, compare exact category sets and criterion/total intervals, and have reviewers check every summary fact and prohibited claim. Proposed gates, requiring committee approval: all injection and out-of-scope controls correct; at least 18/20 exact category sets; zero fabricated findings; scores within approved case intervals; repeated total range no greater than 10 points; no prohibited administrative action. Do not use these draft gates as official acceptance policy without approval.

## Human authority and submission reliability

Real PostgreSQL snapshots of ACCEPTED, REJECTED and REVISION_REQUIRED abstracts were unchanged after analysis completion, including their history and reviewer metadata. No extra notification was sent by analysis. Resubmission discarded a late earlier-revision result and created a distinct job for the new source revision. A public HTTP submission returned 201 before provider execution; after a simulated provider outage its author workspace remained accessible with SUBMITTED status.

Provider unavailability is therefore separate from successful submission. A database enqueue failure still causes the submission transaction to fail atomically rather than silently lose a job; this is a database availability boundary, not an AI-provider call in the request path.

## Admin and regression checks

- Backend: 349 passed, one existing Windows-inapplicable private-storage permission test skipped. This includes the 22 new corpus tests; the 16 live-PostgreSQL scenarios were executed separately.
- Admin: 108 passed with two workers. Public frontend: 78 passed with two workers.
- Type checking and production builds passed for all three packages.
- Desktop 1440×1000 and mobile 390×844 were checked in light and dark modes using exported test-database records and hand-authored analysis output. The original Admin pages/layout, branding, fonts, icons, navigation and human review controls were used. Scoped panel accessibility scans had zero violations in either theme. Page width matched viewport width; the existing mobile table scroller exposed the AI column. No browser errors were recorded.
- UI snapshots are not model-quality results. Their deliberately generic stub classifications/scores validate transport/storage/rendering, not scientific correctness. The display explicitly says the output is synthetic reference material.
- This acceptance work added tests, synthetic fixtures and reports only. No product source, icon exports, branding, payment, registration, authentication or email logic was changed. Temporary preview files were removed and the local dev server/browser closed.

Screenshots: [desktop light](../output/abstract-ai-acceptance/detail-desktop-light.png), [desktop dark](../output/abstract-ai-acceptance/detail-desktop-dark.png), [mobile light](../output/abstract-ai-acceptance/detail-mobile-light.png), [mobile dark](../output/abstract-ai-acceptance/detail-mobile-dark.png), [list desktop](../output/abstract-ai-acceptance/list-desktop-light.png), [list mobile](../output/abstract-ai-acceptance/list-mobile-dark.png), [outdated warning](../output/abstract-ai-acceptance/outdated-mobile-light.png).

## Estimated API usage and cost controls

Actual external usage and charges in this acceptance run: **zero**. Illustrative future usage assumes 2,000 input and 800 billable output tokens per abstract; reasoning tokens and retries may increase actual usage. Standard short-context prices were checked in official OpenAI documentation on 14 October 2026; account model availability has not been verified.

| Candidate | Input / output per million tokens | 20 cases once | 20 cases × 3 repetitions | Reservation for 20 attempts |
| --- | --- | --- | --- | --- |
| GPT-6 Luna | $0.10 / $0.50 | $0.012 | $0.036 | $0.148 |
| GPT-6.1 Sol | $2.00 / $10.00 | $0.24 | $0.72 | $2.96 |

Sources: [official API pricing](https://developers.openai.com/api/docs/pricing), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol). Prices exclude taxes, regional premiums, other processing tiers and hosting.

The implementation reserves `(64000 × input price + 2000 × output price) / 1000000` per attempt at the default output cap. Reservations remain after failed or uncertain calls. Three attempts for twenty jobs would reserve up to $0.444 for Luna or $8.88 for Sol under these rates. Repeatability evaluation may use new explicit test runs, so count all calls against the approved provider project budget. Use exact current rates and provider-side spending limits. A 2,000-token output cap may truncate reasoning-heavy structured responses; verify output sufficiency using the synthetic pilot before recommending a model/configuration.

## Remaining risks and readiness

1. External model quality, latency, schema compatibility and repeated-score consistency are unperformed because no test credential exists. No selected model has passed this corpus.
2. Schema validity does not guarantee category accuracy or factual narratives; human review and semantic calibration remain mandatory.
3. Privacy redaction is best-effort, not guaranteed anonymization. Provider retention/data handling and committee-author notices still require approval before real data could ever be considered.
4. An uncertain provider outcome intentionally blocks further automatic/UI retries. Operator reconciliation is required; exactly-once provider billing is not guaranteed.
5. Audits and cost ledgers are application append-only. Restricted database grants, retention and provider spending controls must be reviewed for any pilot environment.
6. The database tests used the actual three feature-relevant migrations, not a full production-schema restore, production load, process supervisor or deployment environment. Those remain separate integration checks.
7. Existing unrelated Admin formatting lint failures and existing hook warnings remain; this run does not repair unrelated UI.

**Ready:** an isolated synthetic-data reliability/UI pilot, conditional on explicit approval and safe environment setup. **Not yet accepted:** a live external-model pilot or production activation. The next approval should specify a test-only OpenAI project, `OPENAI_API_KEY_TEST`, verified model, synthetic-only scope and a small budget. No staging deployment or activation has been performed, and production settings were not inspected or changed.

## Reproduction and evidence

Use only the stopped test cluster described above. Confirm its path and loopback port before starting it. Run `backend/test/abstract-analysis.acceptance.ts` from an empty test working directory with `AIAIAC_AI_ACCEPTANCE_LOCAL=true`; the script hardcodes the synthetic role/database and validates data_directory. It creates new per-run schemas and consumes no DATABASE_URL or external provider key. Run corpus tests through the existing backend test command. Do not invoke the production worker entry point or enable application flags for this test.

The dedicated cluster is stopped, not deleted. No destructive database command was run. Production activation, schema changes and real-author inference require separate approval. The prior implementation report's unavailable-PostgreSQL limitation is superseded by this report; the external-model limitation remains.
