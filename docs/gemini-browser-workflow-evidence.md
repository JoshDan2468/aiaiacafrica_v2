# Local browser workflow evidence — 2026-10-16

## Completed

Public frontend successfully started through the normal execution tool with
`npm.cmd run dev -- --mode gemini-local --host 127.0.0.1 --port 5173 --strictPort`.
The previous execution restriction did not recur. No restriction was bypassed.
Public and Admin proxies used the existing isolated API on 5057, with dedicated
PostgreSQL database `aiaiac_gemini_e2e_local` on loopback 55437.

Exactly one fictional abstract was filled and submitted through the public browser:
`FICTIONAL LOCAL TEST: AI-assisted pipeline inspection`, 107 words,
fictional author `fictional-author@example.invalid`.
The browser displayed confirmation reference **AIAIAC-ABS-2EA97739**. The same record
was verified in PostgreSQL and displayed in the actual Admin list and detail page.

For this already-submitted record, a private test helper explicitly enqueued its
submission history through the existing analysis repository. This was necessary
because the ordinary API correctly had AI disabled at submission. It is not evidence
of automatic enqueue while real application AI is enabled.

The existing Gemini adapter, Zod validation, scoring, PostgreSQL job/result storage
and worker service processed one injected mock SDK response. No real SDK transport
or external Gemini request was used. The real application enablement/data/pricing
flags remained false. A temporary private API launcher injected an in-memory mock
analysis configuration so the existing Admin endpoints could read the stored result.
No product source or production configuration was changed for this test.

The fictional read-only reviewer authenticated through the existing secure login
service; its session was imported privately into the browser without printing secrets.
The real Admin list and detail displayed the persisted advisory result:

- Categories: Artificial Intelligence, Asset Integrity.
- Relevance, clarity, methodology, contribution, completeness: all 3/4.
- Server-calculated weighted advisory total: 75/100.
- Summary, category explanations, evidence quotes, score explanation and limitations.
- Prominent MOCK TEST wording, draft-rubric and human-decision notices.

The manuscript and history remained SUBMITTED before and after analysis. Reviewer
permissions were exactly abstracts.read. Review mutations, user management and payments
returned 403. No acceptance, rejection or revision decision was made. Prior automated
tests cover preserving existing accepted/rejected/revision-required decisions; this
browser test did not perform a committee decision or author revision/recovery cycle.

## Screenshots

In `output/gemini-e2e-local/`:

1. `01-fictional-form.png`: filled fictional public form before submission.
2. `02-submission-confirmation.png`: successful reference confirmation.
3. `03-admin-list.png`: actual persisted abstract and completed advisory result.
4. `04-mock-advisory-dark.png`: actual Admin detail and mock advisory output, dark mode.
5. `05-mock-advisory-light.png`: same advisory detail, light mode.

Machine-readable worker/storage evidence: `browser-mock-result.json`.
`admin-readiness.json` describes its own HTTP access check (its abstractsSubmitted=0
means that access-check helper submitted none, not that this browser test submitted none).

## Cleanup and limits

Temporary mock API was stopped and the normal private API restarted with real AI
disabled. The fictional record and clearly marked mock result remain in the isolated
database as evidence; with AI disabled the normal API reports AI disabled rather than
exposing results. Screenshots capture the temporary mock-only viewing configuration.
The browser automation session was closed. Public/Admin development servers remain local.
The private services.json PID record predates these foreground restarts and must not
be used to stop a process without fresh process/command-line verification.

No production access, deployment, real author data, paid billing activation or external
Gemini inference occurred. No full live-Gemini end-to-end success is claimed. Remaining:
explicit approval for one real fictional application request with local flags/budget,
automatic queueing under approved real-provider configuration, genuine provider output,
and browser verification of that real output. The draft rubric still needs committee
approval before real conference use.
