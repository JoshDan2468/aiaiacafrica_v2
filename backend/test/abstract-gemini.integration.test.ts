import assert from "node:assert/strict";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import type { PoolClient } from "pg";
import type { GenerateContentResponse } from "@google/genai" with { "resolution-mode": "import" };
import { createApplication } from "../src/app";
import { loadAbstractAiConfig, geminiPricingIsCurrent } from "../src/config/abstractAi";
import { createAbstractAnalysisProvider } from "../src/abstracts/analysisProvider.factory";
import { OpenAiAnalysisProvider } from "../src/abstracts/openaiAnalysis.provider";
import { AnalysisProviderError } from "../src/abstracts/analysisProvider";
import { createAbstractAnalysisRepository } from "../src/repositories/abstractAnalysis.repository";
import { createAbstractSubmissionRepository } from "../src/repositories/abstractSubmission.repository";
import { AbstractAnalysisService } from "../src/services/abstractAnalysis.service";
import { AbstractSubmissionService } from "../src/services/abstractSubmission.service";
import { createAbstractSubmissionController } from "../src/controllers/abstractSubmission.controller";
import { createAbstractSubmissionRouter } from "../src/routes/abstractSubmission.routes";
import { createAdminRouter } from "../src/routes/admin.routes";
import type { EmailService } from "../src/email/email.service";
import type { TransactionRunner } from "../src/types/database";
import { draftRubric } from "../src/abstracts/analysis";

const configured = {
  ABSTRACT_AI_ENABLED: "true",
  ABSTRACT_AI_DATA_APPROVED: "true",
  ABSTRACT_AI_PROVIDER: "gemini",
  ABSTRACT_AI_GEMINI_API_KEY: "application-mock-key",
  ABSTRACT_AI_MODEL: "gemini-3.8-flash",
  ABSTRACT_AI_PRICING_CONFIRMED: "true",
  ABSTRACT_AI_PRICING_APPROVED_UNTIL: new Date(Date.now() + 86400000).toISOString(),
  ABSTRACT_AI_INPUT_USD_PER_MILLION: "2",
  ABSTRACT_AI_OUTPUT_USD_PER_MILLION: "10",
  ABSTRACT_AI_DAILY_BUDGET_USD: "5",
  ABSTRACT_AI_TOTAL_BUDGET_USD: "20",
};
const config = loadAbstractAiConfig(configured)!;
const input = {
  idempotencyKey: "q".repeat(43),
  authorFirstName: "DemoAlpha",
  authorLastName: "DemoBeta",
  authorEmail: "demo-author@example.invalid",
  authorPhone: "123456789",
  organizationName: "Fictional Lab",
  country: "Nigeria",
  title: "Synthetic inspection study for worker integration",
  abstractBody:
    "We compare synthetic inspection methods and describe their limitations. Measurements are fictional and require independent engineering review.",
  keywords: "inspection",
  consent: true as const,
};
const criterion = {
  score: 3,
  explanation: "The synthetic approach is described.",
  evidence: "We compare synthetic inspection methods",
};
const result = {
  summary: "A synthetic inspection comparison.",
  categories: [{ category: "Asset Integrity", explanation: "The study concerns inspection." }],
  criteria: {
    relevance: criterion,
    clarity: criterion,
    methodology: criterion,
    contribution: criterion,
    completeness: criterion,
  },
  issues: ["Independent validation is needed."],
  scoreExplanation: "Synthetic advisory assessment only.",
};
const success = () =>
  ({
    modelVersion: config.model,
    responseId: "mock-response",
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(result) }] } }],
    usageMetadata: {
      promptTokenCount: 1000,
      candidatesTokenCount: 700,
      thoughtsTokenCount: 100,
      totalTokenCount: 1800,
    },
  }) as GenerateContentResponse;

// SQL-boundary mocks exercise the real repositories/services/controllers without a database or network.
type Row = Record<string, any>;
function databaseFixture() {
  const state = {
    row: null as Row | null,
    histories: [] as Row[],
    jobs: [] as Row[],
    events: [] as Row[],
    attempts: [] as Row[],
    results: new Map<string, unknown>(),
    queries: [] as string[],
    failEnqueue: false,
    aborted: false,
  };
  const checkpoints = new Map<string, { jobs: Row[]; events: Row[] }>();
  const client = {
    async query(sql: string, values: any[] = []) {
      state.queries.push(sql);
      const answer = (rows: unknown[] = []) => ({ rows, rowCount: rows.length });
      if (sql.startsWith("ROLLBACK TO SAVEPOINT")) {
        state.aborted = false;
        const checkpoint = checkpoints.get(sql.split(" ").at(-1)!);
        if (checkpoint) {
          state.jobs = structuredClone(checkpoint.jobs);
          state.events = structuredClone(checkpoint.events);
        }
        return answer();
      }
      if (state.aborted) throw new Error("Transaction remains aborted until rollback to savepoint");
      if (sql.startsWith("SAVEPOINT")) {
        checkpoints.set(sql.split(" ").at(-1)!, {
          jobs: structuredClone(state.jobs),
          events: structuredClone(state.events),
        });
        return answer();
      }
      if (sql.startsWith("RELEASE SAVEPOINT")) return answer();
      if (sql.includes("INSERT INTO abstract_events")) {
        state.events.push({
          id: values[0],
          abstract_submission_id: values[1],
          event_type: values[2],
          details: JSON.parse(values[4]),
        });
        return answer();
      }
      if (sql.includes("INSERT INTO abstract_submissions")) {
        state.row = Object.fromEntries(
          [
            "id",
            "reference",
            "author_first_name",
            "author_last_name",
            "author_email",
            "author_phone",
            "organization_name",
            "job_title",
            "country",
            "title",
            "abstract_body",
            "word_count",
            "keywords",
            "topic",
            "content_fingerprint",
            "submission_key_hash",
            "continuation_token_expires_at",
            "submitted_at",
          ].map((key, index) => [key, values[index]]),
        );
        Object.assign(state.row, {
          status: "SUBMITTED",
          continuation_token_hash: values[15],
          created_at: values[17],
          reviewer_name: null,
        });
        return answer([state.row]);
      }
      if (sql.includes("INSERT INTO abstract_submission_history")) {
        state.histories.push(
          Object.fromEntries(
            [
              "id",
              "abstract_submission_id",
              "action",
              "from_status",
              "to_status",
              "admin_id",
              "author_visible_reason",
              "internal_note",
              "title_snapshot",
              "abstract_body_snapshot",
              "word_count_snapshot",
              "keywords_snapshot",
              "topic_snapshot",
              "created_at",
            ].map((key, index) => [key, values[index]]),
          ),
        );
        return answer();
      }
      if (sql.includes("WHERE submission_key_hash"))
        return answer(state.row?.submission_key_hash === values[0] ? [state.row] : []);
      if (sql.includes("WHERE event_year = 2027")) return answer();
      if (sql.includes("FROM abstract_notifications")) return answer();
      if (sql.includes("UPDATE abstract_submissions SET status='SUBMITTED'")) {
        Object.assign(state.row!, {
          status: "SUBMITTED",
          submitted_at: values[1],
          resubmitted_at: values[1],
        });
        return answer([state.row!]);
      }
      if (sql.includes("FROM abstract_submissions WHERE id=$1 FOR UPDATE"))
        return answer(state.row ? [state.row] : []);
      if (sql.includes("SELECT abstract.*, reviewer.full_name"))
        return answer(state.row ? [state.row] : []);
      if (sql.includes("SELECT history.*, reviewer.full_name")) return answer(state.histories);
      if (sql.includes("SELECT a.id,h.id AS history_id")) {
        const rows = state.histories.filter(
          (h) =>
            state.events.some((e) => e.details?.aiRequestedHistoryId === h.id) &&
            state.row?.submitted_at === h.created_at &&
            ["SUBMITTED", "UNDER_REVIEW"].includes(state.row!.status) &&
            !state.jobs.some((j) => j.source_history_id === h.id),
        );
        return answer(rows.map((h) => ({ id: h.abstract_submission_id, history_id: h.id })));
      }
      if (sql.includes("UPDATE abstract_ai_jobs SET status='OUTDATED'")) {
        const previous = state.jobs.filter(
          (j) => j.abstract_submission_id === values[0] && j.source_history_id !== values[1],
        );
        previous.forEach((j) => {
          j.status = "OUTDATED";
        });
        return answer(previous.map((j) => ({ id: j.id })));
      }
      if (sql.includes("INSERT INTO abstract_ai_jobs")) {
        if (state.failEnqueue) {
          state.aborted = true;
          throw new Error("Synthetic AI table unavailable");
        }
        if (state.jobs.some((j) => j.source_history_id === values[2])) return answer();
        const job = {
          id: values[0],
          abstract_submission_id: values[1],
          source_history_id: values[2],
          rubric: JSON.parse(values[3]),
          rubric_hash: values[4],
          prompt_version: values[5],
          model: values[6],
          max_attempts: values[7],
          attempts: 0,
          status: "QUEUED",
          retry_allowed: false,
        };
        state.jobs.push(job);
        return answer([{ id: job.id }]);
      }
      if (sql.includes("INSERT INTO abstract_ai_events")) {
        state.events.push({ id: values[0], job_id: values[1], event_type: values[2] });
        return answer();
      }
      if (sql.includes("AS blocked"))
        return answer([
          {
            blocked: state.attempts.some(
              (a) =>
                a.finished &&
                (a.input == null ||
                  a.output == null ||
                  ["OUTCOME_UNKNOWN", "USAGE_UNVERIFIED"].includes(a.outcome)),
            ),
          },
        ]);
      if (sql.includes("AS active")) return answer([{ active: "0", recent: "0" }]);
      if (sql.includes("SELECT * FROM abstract_ai_jobs"))
        return answer(state.jobs.filter((j) => j.status === "QUEUED").slice(0, 1));
      if (sql.includes("AS current"))
        return answer([
          {
            current:
              state.histories.find((h) => h.id === values[1])?.created_at ===
              state.row?.submitted_at,
          },
        ]);
      if (sql.includes("AS daily")) {
        const total = state.attempts.reduce((n, a) => n + a.reserved, 0);
        return answer([{ daily: String(total), total: String(total) }]);
      }
      if (sql.includes("ARRAY[a.author_first_name"))
        return answer([
          {
            ...state.histories.find((h) => h.id === values[0]),
            identity: [input.authorFirstName, input.authorLastName, input.authorEmail],
          },
        ]);
      if (sql.includes("UPDATE abstract_ai_jobs SET status='PROCESSING'")) {
        Object.assign(
          state.jobs.find((j) => j.id === values[0])!,
          { status: "PROCESSING", lease_token: values[1] },
        );
        return answer();
      }
      if (sql.includes("INSERT INTO abstract_ai_attempts")) {
        state.attempts.push({
          id: values[0],
          job_id: values[1],
          reserved: values[3],
          finished: false,
        });
        return answer();
      }
      if (sql.startsWith("SELECT abstract_submission_id FROM abstract_ai_jobs"))
        return answer(state.jobs.filter((j) => j.id === values[0]));
      if (sql.includes("UPDATE abstract_ai_jobs j SET status='COMPLETED'")) {
        const job = state.jobs.find((j) => j.id === values[0]);
        const history = state.histories.find((h) => h.id === job?.source_history_id);
        if (job?.status !== "PROCESSING" || history?.created_at !== state.row?.submitted_at)
          return answer();
        job.status = "COMPLETED";
        return answer([{ id: job.id }]);
      }
      if (sql.includes("INSERT INTO abstract_ai_results")) {
        state.results.set(values[0], JSON.parse(values[1]));
        return answer();
      }
      if (sql.includes("UPDATE abstract_ai_attempts SET outcome=$2")) {
        Object.assign(
          state.attempts.find((a) => a.id === values[0])!,
          { outcome: values[1], input: values[2], output: values[3], finished: true },
        );
        return answer();
      }
      if (sql.includes("UPDATE abstract_ai_jobs SET status=CASE")) {
        const job = state.jobs.find((j) => j.id === values[0])!;
        Object.assign(job, {
          status: values[2] ? "QUEUED" : "FAILED",
          failure_code: values[3],
          retry_allowed: values[5],
        });
        return answer([{ id: job.id }]);
      }
      if (sql.includes("SELECT DISTINCT ON (a.reference)")) {
        const job = state.jobs.filter((j) => j.status !== "OUTDATED").at(-1) ?? state.jobs.at(-1);
        if (!job) return answer();
        const history = state.histories.find((h) => h.id === job.source_history_id)!;
        return answer([
          {
            ...job,
            reference: state.row!.reference,
            result: state.results.get(job.id) ?? null,
            content_current:
              history.created_at === state.row!.submitted_at &&
              history.abstract_body_snapshot === state.row!.abstract_body,
          },
        ]);
      }
      return answer();
    },
  } as unknown as PoolClient;
  const transaction: TransactionRunner = async (work) => work(client);
  return { state, client, transaction };
}

async function applicationFixture(
  options: {
    failEnqueue?: boolean;
    failure?: unknown;
    response?: GenerateContentResponse;
    budget?: string;
    enabled?: boolean;
    timeout?: boolean;
  } = {},
) {
  const db = databaseFixture();
  db.state.failEnqueue = options.failEnqueue ?? false;
  const selected = loadAbstractAiConfig({
    ...configured,
    ...(options.budget ? { ABSTRACT_AI_DAILY_BUDGET_USD: options.budget } : {}),
    ...(options.timeout ? { ABSTRACT_AI_TIMEOUT_MS: "1000" } : {}),
  })!;
  const analysisRepo = createAbstractAnalysisRepository(selected, db.client, db.transaction);
  const submissionRepo = createAbstractSubmissionRepository(
    db.client,
    db.transaction,
    options.enabled === false
      ? undefined
      : (client, id, history) => analysisRepo.enqueue(client, id, history),
  );
  const submissionService = new AbstractSubmissionService(
    submissionRepo,
    {} as EmailService,
    new Date("2099-01-01"),
  );
  let calls = 0;
  const provider = await createAbstractAnalysisProvider(selected, {
    geminiClient: {
      models: {
        async generateContent(request) {
          calls++;
          const text = JSON.stringify(request.contents);
          for (const personal of [input.authorEmail, input.authorFirstName, input.authorLastName])
            assert.equal(text.includes(personal), false);
          if (options.timeout) return new Promise<GenerateContentResponse>(() => {});
          if (options.failure) throw options.failure;
          return options.response ?? success();
        },
      },
    },
  });
  const worker = new AbstractAnalysisService(analysisRepo, provider);
  const controller = createAbstractSubmissionController(submissionService, worker);
  const router = Router();
  router.use(
    createAbstractSubmissionRouter({ controller, rateLimiter: (_req, _res, next) => next() }),
  );
  const auth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role");
    if (!role) {
      res.sendStatus(401);
      return;
    }
    res.locals.admin = { id: "mock-admin", role };
    next();
  };
  router.use(
    "/admin",
    createAdminRouter({ requireAuth: auth, abstractSubmissionController: controller }),
  );
  const app = createApplication({ apiRouter: router });
  return { ...db, app, worker, analysisRepo, submissionRepo, selected, calls: () => calls };
}

test("application Gemini config never falls back to synthetic/generic keys and requires current positive pricing", async () => {
  assert.equal(loadAbstractAiConfig({}), null);
  for (const override of [
    { ABSTRACT_AI_ENABLED: "false" },
    { ABSTRACT_AI_DATA_APPROVED: "false" },
    {
      ABSTRACT_AI_GEMINI_API_KEY: "",
      GEMINI_API_KEY_TEST: "test-only",
      ABSTRACT_AI_API_KEY: "generic",
    },
    { GEMINI_API_KEY_TEST: configured.ABSTRACT_AI_GEMINI_API_KEY },
    { ABSTRACT_AI_MODEL: "gemini-other" },
    { ABSTRACT_AI_PRICING_CONFIRMED: "false" },
    { ABSTRACT_AI_PRICING_APPROVED_UNTIL: "" },
    { ABSTRACT_AI_PRICING_APPROVED_UNTIL: "2020-01-01" },
    { ABSTRACT_AI_INPUT_USD_PER_MILLION: "0" },
    { ABSTRACT_AI_INPUT_USD_PER_MILLION: "0.1" },
    { ABSTRACT_AI_OUTPUT_USD_PER_MILLION: "1" },
  ])
    assert.equal(loadAbstractAiConfig({ ...configured, ...override }), null);
  assert.equal(config.provider, "gemini");
  assert.equal(config.apiKey, "application-mock-key");
  const openai = loadAbstractAiConfig({
    ...configured,
    ABSTRACT_AI_PROVIDER: "openai",
    ABSTRACT_AI_MODEL: "mock-openai",
    ABSTRACT_AI_API_KEY: "openai-app",
  })!;
  assert.ok((await createAbstractAnalysisProvider(openai)) instanceof OpenAiAnalysisProvider);
  assert.equal(geminiPricingIsCurrent({ ...config, pricingApprovedUntil: "2020-01-01" }), false);
});

test("public submission -> existing queue -> Gemini worker -> stored advisory result -> protected Admin detail", async () => {
  const f = await applicationFixture();
  const submitted = await request(f.app).post("/api/abstract-submissions").send(input);
  assert.equal(submitted.status, 201);
  assert.equal(f.calls(), 0);
  assert.equal(f.state.jobs.length, 1);
  assert.equal(f.state.row!.status, "SUBMITTED");
  await f.worker.runOne();
  assert.equal(f.calls(), 1);
  assert.equal(f.state.results.size, 1);
  assert.equal(f.state.row!.status, "SUBMITTED");
  assert.equal(f.state.attempts[0]!.output, 800);
  assert.equal(f.state.attempts[0]!.input, 1000);
  assert.ok(f.state.attempts[0]!.reserved > 0);
  const path = `/api/admin/abstract-submissions/${f.state.row!.reference}`;
  assert.equal((await request(f.app).get(path)).status, 401);
  assert.equal((await request(f.app).get(path).set("x-test-role", "FINANCE")).status, 403);
  const visible = await request(f.app).get(path).set("x-test-role", "ADMIN");
  assert.equal(visible.status, 200);
  assert.equal(visible.body.data.submission.aiAnalysis.status, "COMPLETED");
  assert.equal(visible.body.data.submission.aiAnalysis.result.advisoryScore, 75);
  assert.equal(
    visible.body.data.submission.aiAnalysis.result.categories[0].category,
    "Asset Integrity",
  );
  assert.equal(visible.text.includes(config.apiKey), false);
  await f.worker.runOne();
  assert.equal(f.calls(), 1);
});

test("AI SQL failure cannot abort submission; exact durable intent reconciles once after recovery", async () => {
  const f = await applicationFixture({ failEnqueue: true });
  assert.equal((await request(f.app).post("/api/abstract-submissions").send(input)).status, 201);
  assert.equal(f.state.aborted, false);
  assert.equal(f.state.row!.status, "SUBMITTED");
  assert.equal(f.state.jobs.length, 0);
  assert.ok(f.state.events.some((e) => e.details?.aiRequestedHistoryId));
  assert.ok(f.state.queries.includes("ROLLBACK TO SAVEPOINT abstract_ai_enqueue"));
  f.state.failEnqueue = false;
  await f.worker.runOne();
  assert.equal(f.calls(), 1);
  assert.equal(f.state.results.size, 1);
  await f.worker.runOne();
  assert.equal(f.calls(), 1);
  assert.equal(f.state.jobs.length, 1);
});

test("resubmission queues a fresh revision, retains prior result and does not change human decisions", async () => {
  const f = await applicationFixture();
  await request(f.app).post("/api/abstract-submissions").send(input);
  await f.worker.runOne();
  const oldJob = f.state.jobs[0]!.id;
  f.state.row!.status = "REVISION_REQUIRED";
  f.state.row!.abstract_body += " Revised evidence is still synthetic.";
  assert.equal(
    (await f.worker.views([f.state.row!.reference]))[f.state.row!.reference]!.status,
    "OUTDATED",
  );
  await f.submissionRepo.resubmit(f.state.row!.id, new Date(Date.now() + 1000));
  assert.equal(f.state.jobs[0]!.status, "OUTDATED");
  assert.equal(f.state.jobs.length, 2);
  f.state.row!.status = "UNDER_REVIEW";
  await f.worker.runOne();
  assert.equal(f.calls(), 2);
  assert.equal(f.state.results.size, 2);
  assert.ok(f.state.results.has(oldJob));
  assert.equal(f.state.row!.status, "UNDER_REVIEW");
});

for (const [name, options, code] of [
  [
    "HTTP 503",
    { failure: { status: 503, message: "do not store raw provider body" } },
    "OUTCOME_UNKNOWN",
  ],
  ["timeout", { timeout: true }, "OUTCOME_UNKNOWN"],
  ["network loss", { failure: new Error("synthetic network loss") }, "OUTCOME_UNKNOWN"],
  ["unknown usage", { response: { ...success(), usageMetadata: undefined } }, "USAGE_UNVERIFIED"],
  [
    "inconsistent totals",
    {
      response: {
        ...success(),
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 700, totalTokenCount: 9999 },
      },
    },
    "USAGE_UNVERIFIED",
  ],
  [
    "usage above output reservation",
    {
      response: {
        ...success(),
        usageMetadata: {
          promptTokenCount: 1000,
          candidatesTokenCount: 2001,
          totalTokenCount: 3001,
        },
      },
    },
    "USAGE_UNVERIFIED",
  ],
  [
    "invented action",
    {
      response: {
        ...success(),
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify({ ...result, status: "ACCEPTED" }) }] },
          },
        ],
      },
    },
    "INVALID_RESPONSE",
  ],
] as const)
  test(`Gemini ${name} preserves submission and prevents unsafe automatic retry`, async () => {
    const f = await applicationFixture(options as Parameters<typeof applicationFixture>[0]);
    assert.equal((await request(f.app).post("/api/abstract-submissions").send(input)).status, 201);
    await f.worker.runOne();
    assert.equal(f.state.row!.status, "SUBMITTED");
    assert.equal(f.state.results.size, 0);
    assert.equal(f.state.jobs[0]!.failure_code, code);
    assert.equal(f.state.jobs[0]!.status, "FAILED");
    if (code === "OUTCOME_UNKNOWN" || code === "USAGE_UNVERIFIED") {
      f.state.jobs.push({ ...f.state.jobs[0]!, id: "another-queued-job", status: "QUEUED" });
    }
    await f.worker.runOne();
    assert.equal(f.calls(), 1);
    if (name === "HTTP 503")
      assert.ok(f.state.events.some((e) => e.event_type === "HTTP_503_SERVER_ERROR"));
  });

test("insufficient budget prevents provider dispatch before reservation", async () => {
  const f = await applicationFixture({ budget: "0.00001" });
  await request(f.app).post("/api/abstract-submissions").send(input);
  await f.worker.runOne();
  assert.equal(f.calls(), 0);
  assert.equal(f.state.attempts.length, 0);
});

test("unmarked submissions made with AI disabled are never reconciled or backfilled", async () => {
  const f = await applicationFixture({ enabled: false });
  assert.equal((await request(f.app).post("/api/abstract-submissions").send(input)).status, 201);
  assert.equal(
    f.state.events.some((event) => event.details?.aiRequestedHistoryId),
    false,
  );
  await f.worker.runOne();
  assert.equal(f.calls(), 0);
  assert.equal(f.state.jobs.length, 0);
});

test("pricing expiry after startup stops dispatch before a provider call", async () => {
  const f = await applicationFixture();
  await request(f.app).post("/api/abstract-submissions").send(input);
  f.selected.pricingApprovedUntil = "2020-01-01";
  await f.worker.runOne();
  assert.equal(f.calls(), 0);
  assert.equal(f.state.attempts.length, 0);
});

test("reconciliation only considers current opted-in revisions and uses locked bounded claims", async () => {
  const f = await applicationFixture({ failEnqueue: true });
  await request(f.app).post("/api/abstract-submissions").send(input);
  f.state.failEnqueue = false;
  f.state.row!.status = "ACCEPTED";
  await f.worker.runOne();
  assert.equal(f.calls(), 0);
  const sql = f.state.queries.find((value) => value.includes("SELECT a.id,h.id AS history_id"))!;
  assert.match(sql, /aiRequestedHistoryId/);
  assert.match(sql, /a.submitted_at=h.created_at/);
  assert.match(sql, /NOT EXISTS/);
  assert.match(sql, /LIMIT 25 FOR UPDATE OF a SKIP LOCKED/);
});
