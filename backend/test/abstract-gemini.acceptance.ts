/** Real PostgreSQL workflow tests. Hard-pinned private cluster, fake research and mocked Gemini only. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import type { GenerateContentResponse } from "@google/genai" with { "resolution-mode": "import" };
import { createApplication } from "../src/app";
import { loadAbstractAiConfig } from "../src/config/abstractAi";
import { createAbstractAnalysisProvider } from "../src/abstracts/analysisProvider.factory";
import { createAbstractAnalysisRepository } from "../src/repositories/abstractAnalysis.repository";
import { createAbstractSubmissionRepository } from "../src/repositories/abstractSubmission.repository";
import { AbstractAnalysisService } from "../src/services/abstractAnalysis.service";
import { AbstractSubmissionService } from "../src/services/abstractSubmission.service";
import { createAbstractSubmissionController } from "../src/controllers/abstractSubmission.controller";
import { createAbstractSubmissionRouter } from "../src/routes/abstractSubmission.routes";
import { createAdminRouter } from "../src/routes/admin.routes";
import { EmailService } from "../src/email/email.service";
import type { TransactionRunner } from "../src/types/database";
import type { AbstractSubmissionInput } from "../src/types/abstractSubmission";

const root = resolve(__dirname, "../..");
const output = resolve(root, "output/gemini-postgres-workflow");
const connection = {
  host: "127.0.0.1",
  port: 55437,
  user: "aiaiac_ai_test",
  database: "aiaiac_ai_acceptance",
  password: "",
  ssl: false as const,
  connectionTimeoutMillis: 3000,
};
const pools: Pool[] = [];
const runId = Date.now().toString(36);
const results: { name: string; status: string; detail?: string }[] = [];
const config = loadAbstractAiConfig({
  ABSTRACT_AI_ENABLED: "true",
  ABSTRACT_AI_DATA_APPROVED: "true",
  ABSTRACT_AI_PROVIDER: "gemini",
  ABSTRACT_AI_GEMINI_API_KEY: "not-a-real-application-key",
  ABSTRACT_AI_MODEL: "gemini-3.8-flash",
  ABSTRACT_AI_PRICING_CONFIRMED: "true",
  ABSTRACT_AI_PRICING_APPROVED_UNTIL: new Date(Date.now() + 86400000).toISOString(),
  ABSTRACT_AI_INPUT_USD_PER_MILLION: "2",
  ABSTRACT_AI_OUTPUT_USD_PER_MILLION: "10",
  ABSTRACT_AI_DAILY_BUDGET_USD: "5",
  ABSTRACT_AI_TOTAL_BUDGET_USD: "20",
  ABSTRACT_AI_MAX_ATTEMPTS: "1",
  ABSTRACT_AI_REQUESTS_PER_MINUTE: "60",
})!;
const evidence = "Generated measurements are compared with a fixed baseline.";
const body = `This fictional study compares inspection methods using generated data. ${evidence} The simulated findings require independent engineering review and do not establish field performance. This text is test data only.`;
const criterion = { score: 3, explanation: "The test abstract describes its approach.", evidence };
const analysisValue = {
  summary: "A fictional inspection-method comparison using generated data.",
  categories: [
    { category: "Asset Integrity", explanation: "Inspection methods support integrity review." },
  ],
  criteria: {
    relevance: criterion,
    clarity: criterion,
    methodology: criterion,
    contribution: criterion,
    completeness: criterion,
  },
  issues: ["Independent validation is needed."],
  scoreExplanation: "Advisory hand-authored test output.",
};
async function guard(pool: Pool) {
  assert.equal(
    process.env.AIAIAC_GEMINI_PG_ACCEPTANCE_LOCAL,
    "true",
    "Explicit isolated-database opt-in required",
  );
  const identity = (
    await pool.query(
      "SELECT current_database() AS db,current_user AS actor,current_setting('data_directory') AS directory,current_setting('listen_addresses') AS addresses,current_setting('port') AS port",
    )
  ).rows[0];
  assert.equal(identity.db, connection.database);
  assert.equal(identity.actor, connection.user);
  assert.equal(
    String(identity.directory).replaceAll("\\", "/").toLowerCase(),
    resolve(root, ".private/abstract-ai-acceptance-20261014/cluster")
      .replaceAll("\\", "/")
      .toLowerCase(),
  );
  assert.equal(identity.addresses, "127.0.0.1");
  assert.equal(identity.port, "55437");
}
async function context(
  index: number,
  options: {
    brokenQueue?: boolean;
    disabledQueue?: boolean;
    failMode?: "503" | "usage";
    budget?: number;
  } = {},
) {
  const schema = `gemini_workflow_${runId}_${index}`;
  assert.match(schema, /^gemini_workflow_[a-z0-9]+_\d+$/);
  const bootstrap = new Pool(connection);
  try {
    await guard(bootstrap);
    const client = await bootstrap.connect();
    try {
      const { runner } = await import("node-pg-migrate");
      await runner({
        dbClient: client,
        dir: [
          "20260820060315610_admin-authentication.ts",
          "20260922030000000_abstract-submissions.ts",
          "20261014010000000_abstract-ai-analysis.ts",
        ].map((file) => resolve(root, "backend/migrations", file)),
        useGlob: true,
        schema,
        createSchema: true,
        migrationsTable: "pgmigrations",
        direction: "up",
        log: () => {},
      });
    } finally {
      client.release();
    }
  } finally {
    await bootstrap.end();
  }
  const pool = new Pool({ ...connection, max: 8, options: `-c search_path=${schema}` });
  pools.push(pool);
  const tx: TransactionRunner = async (work) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const value = await work(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };
  const selected = { ...config, ...(options.budget ? { dailyBudgetUsd: options.budget } : {}) };
  const analysisRepo = createAbstractAnalysisRepository(selected, pool, tx);
  let broken = options.brokenQueue ?? false;
  const submissionRepo = createAbstractSubmissionRepository(
    pool,
    tx,
    options.disabledQueue
      ? undefined
      : async (client, id, history) => {
          if (broken) await client.query("SELECT 1/0"); // Genuine aborted PostgreSQL subtransaction.
          await analysisRepo.enqueue(client, id, history);
        },
  );
  let now = Date.now();
  let emailCalls = 0;
  let providerCalls = 0;
  const service = new AbstractSubmissionService(
    submissionRepo,
    new EmailService(
      {
        async send() {
          emailCalls++;
        },
      },
      "http://127.0.0.1",
    ),
    new Date("2099-01-01"),
    24,
    30,
    () => new Date(now++),
  );
  const adminId = randomUUID();
  await pool.query(
    "INSERT INTO admins(id,full_name,email,password_hash,role) VALUES($1,'Local test reviewer',$2,'not-a-login-hash','ADMIN')",
    [adminId, `${adminId}@example.invalid`],
  );
  const provider = await createAbstractAnalysisProvider(selected, {
    geminiClient: {
      models: {
        async generateContent(request) {
          providerCalls++;
          assert.equal(request.model, config.model);
          assert.equal(request.config?.httpOptions?.retryOptions?.attempts, 1);
          assert.equal(JSON.stringify(request.contents).includes("authorEmail"), false);
          if (options.failMode === "503")
            throw { status: 503, message: "raw diagnostic must not be persisted" };
          const response = {
            modelVersion: config.model,
            responseId: "local-mock",
            candidates: [
              {
                finishReason: "STOP",
                content: { parts: [{ text: JSON.stringify(analysisValue) }] },
              },
            ],
            ...(options.failMode === "usage"
              ? {}
              : {
                  usageMetadata: {
                    promptTokenCount: 1000,
                    candidatesTokenCount: 600,
                    thoughtsTokenCount: 100,
                    totalTokenCount: 1700,
                  },
                }),
          };
          return response as GenerateContentResponse;
        },
      },
    },
  });
  const worker = new AbstractAnalysisService(analysisRepo, provider);
  const controller = createAbstractSubmissionController(service, worker);
  const router = Router();
  router.use(
    createAbstractSubmissionRouter({ controller, rateLimiter: (_req, _res, next) => next() }),
  );
  const auth: RequestHandler = (req, res, next) => {
    const role = req.header("x-local-role");
    if (!role) {
      res.sendStatus(401);
      return;
    }
    res.locals.admin = { id: adminId, role };
    next();
  };
  router.use(
    "/admin",
    createAdminRouter({ requireAuth: auth, abstractSubmissionController: controller }),
  );
  const app = createApplication({ apiRouter: router });
  const input = (): AbstractSubmissionInput => ({
    idempotencyKey: randomBytes(32).toString("base64url"),
    authorFirstName: "TestGivenAlpha",
    authorLastName: "TestFamilyBeta",
    authorEmail: `${randomUUID()}@example.invalid`,
    authorPhone: "+2348000000000",
    organizationName: "IsolatedLabZ",
    country: "Nigeria",
    title: `Fictional inspection ${randomUUID()}`,
    abstractBody: body,
    keywords: "inspection",
    consent: true,
  });
  const submit = async () => {
    const response = await request(app).post("/api/abstract-submissions").send(input());
    assert.equal(response.status, 201);
    return response.body.data.reference as string;
  };
  const count = async (table: string) => {
    assert.ok(
      [
        "abstract_submissions",
        "abstract_ai_jobs",
        "abstract_ai_results",
        "abstract_ai_attempts",
        "abstract_submission_history",
      ].includes(table),
    );
    return Number((await pool.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
  };
  return {
    schema,
    pool,
    tx,
    analysisRepo,
    submissionRepo,
    service,
    worker,
    app,
    adminId,
    submit,
    input,
    count,
    recoverQueue: () => {
      broken = false;
    },
    breakQueue: () => {
      broken = true;
    },
    calls: () => providerCalls,
    emails: () => emailCalls,
  };
}
async function scenario(name: string, work: () => Promise<void>) {
  try {
    await work();
    results.push({ name, status: "PASS" });
    console.info(`PASS ${name}`);
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      detail: error instanceof Error ? error.message : "Unknown test failure",
    });
    console.error(`FAIL ${name}`, error);
  }
}
async function main() {
  assert.equal(process.env.AIAIAC_GEMINI_PG_ACCEPTANCE_LOCAL, "true");
  globalThis.fetch = async () => {
    throw new Error("External HTTP is forbidden in this local PostgreSQL test");
  };
  mkdirSync(output, { recursive: true });
  await scenario(
    "Submission persistence, automatic queue, Gemini worker, stored result and authorized Admin retrieval",
    async () => {
      const c = await context(1);
      const reference = await c.submit();
      assert.equal(await c.count("abstract_submissions"), 1);
      assert.equal(await c.count("abstract_ai_jobs"), 1);
      assert.equal(c.calls(), 0);
      assert.equal(await c.worker.runOne(), true);
      assert.equal(c.calls(), 1);
      assert.equal(await c.count("abstract_ai_results"), 1);
      const path = `/api/admin/abstract-submissions/${reference}`;
      assert.equal((await request(c.app).get(path)).status, 401);
      assert.equal((await request(c.app).get(path).set("x-local-role", "FINANCE")).status, 403);
      const response = await request(c.app).get(path).set("x-local-role", "ADMIN");
      assert.equal(response.status, 200);
      const submission = response.body.data.submission;
      assert.equal(submission.status, "SUBMITTED");
      assert.equal(submission.aiAnalysis.status, "COMPLETED");
      assert.equal(submission.aiAnalysis.result.advisoryScore, 75);
      assert.equal(submission.aiAnalysis.result.categories[0].category, "Asset Integrity");
      assert.equal(response.text.includes(config.apiKey), false);
      const usage = (
        await c.pool.query(
          "SELECT input_tokens,output_tokens,reserved_usd FROM abstract_ai_attempts",
        )
      ).rows[0];
      assert.equal(usage.input_tokens, 1000);
      assert.equal(usage.output_tokens, 700);
      assert.ok(Number(usage.reserved_usd) > 0);
      await c.worker.runOne();
      assert.equal(c.calls(), 1);
    },
  );
  await scenario(
    "Real SQL enqueue failure cannot roll back submission; durable intent reconciles once",
    async () => {
      const c = await context(2, { brokenQueue: true });
      const reference = await c.submit();
      assert.equal(await c.count("abstract_submissions"), 1);
      assert.equal(await c.count("abstract_ai_jobs"), 0);
      assert.equal(
        Number(
          (
            await c.pool.query(
              "SELECT count(*) AS n FROM abstract_events WHERE details ? 'aiRequestedHistoryId'",
            )
          ).rows[0].n,
        ),
        1,
      );
      assert.equal((await c.service.getAdminDetail(reference))?.status, "SUBMITTED");
      c.recoverQueue();
      const reconciled = await Promise.all(
        Array.from({ length: 4 }, () => c.analysisRepo.reconcile!()),
      );
      assert.equal(
        reconciled.reduce((n, value) => n + value, 0),
        1,
      );
      assert.equal(await c.count("abstract_ai_jobs"), 1);
      await c.worker.runOne();
      await c.worker.runOne();
      assert.equal(c.calls(), 1);
      assert.equal(await c.count("abstract_ai_results"), 1);
    },
  );
  await scenario(
    "Revision/resubmission preserves earlier analysis and reconciles only the current revision",
    async () => {
      const c = await context(3, { brokenQueue: true });
      const reference = await c.submit();
      c.recoverQueue();
      await c.worker.runOne();
      await c.service.review(reference, "REVIEW_STARTED", c.adminId, null, null);
      await c.service.review(
        reference,
        "REVISION_REQUIRED",
        c.adminId,
        "Add the missing synthetic measurement details.",
        null,
      );
      const row = (
        await c.pool.query("SELECT id FROM abstract_submissions WHERE reference=$1", [reference])
      ).rows[0];
      await c.service.updateRevision(
        { id: row.id },
        {
          title: "Revised fictional inspection",
          abstractBody: `${body} Additional generated measurements are included.`,
          keywords: "inspection",
        },
      );
      assert.equal((await c.worker.views([reference]))[reference]?.status, "OUTDATED");
      await c.service.resubmit({ id: row.id });
      assert.equal(await c.count("abstract_ai_jobs"), 2);
      await c.worker.runOne();
      assert.equal(c.calls(), 2);
      assert.equal(await c.count("abstract_ai_results"), 2);
      assert.equal((await c.service.getAdminDetail(reference))?.status, "SUBMITTED");
      assert.equal(
        (await c.pool.query("SELECT count(*) AS n FROM abstract_ai_jobs WHERE status='OUTDATED'"))
          .rows[0].n,
        "1",
      );
    },
  );
  await scenario(
    "HTTP 503 records uncertainty and safe diagnostics; blocks retry and further dispatch",
    async () => {
      const c = await context(4, { failMode: "503" });
      const a = await c.submit();
      const b = await c.submit();
      await c.worker.runOne();
      await c.worker.runOne();
      assert.equal(c.calls(), 1);
      assert.equal(await c.count("abstract_ai_attempts"), 1);
      const attempt = (
        await c.pool.query(
          "SELECT outcome,input_tokens,output_tokens,reserved_usd FROM abstract_ai_attempts",
        )
      ).rows[0];
      assert.equal(attempt.outcome, "OUTCOME_UNKNOWN");
      assert.equal(attempt.input_tokens, null);
      assert.equal(attempt.output_tokens, null);
      assert.ok(Number(attempt.reserved_usd) > 0);
      assert.equal(
        (
          await c.pool.query(
            "SELECT count(*) AS n FROM abstract_ai_events WHERE event_type='HTTP_503_SERVER_ERROR'",
          )
        ).rows[0].n,
        "1",
      );
      assert.equal(
        (await c.pool.query("SELECT count(*) AS n FROM abstract_ai_jobs WHERE status='QUEUED'"))
          .rows[0].n,
        "1",
      );
      for (const reference of [a, b]) {
        assert.equal((await c.service.getAdminDetail(reference))?.status, "SUBMITTED");
        assert.equal(await c.analysisRepo.retry(reference, c.adminId), false);
      }
    },
  );
  await scenario(
    "Missing Gemini usage fails closed and prevents processing other queued abstracts",
    async () => {
      const c = await context(5, { failMode: "usage" });
      await c.submit();
      await c.submit();
      await c.worker.runOne();
      await c.worker.runOne();
      assert.equal(c.calls(), 1);
      assert.equal(await c.count("abstract_ai_results"), 0);
      assert.equal(
        (await c.pool.query("SELECT outcome FROM abstract_ai_attempts")).rows[0].outcome,
        "USAGE_UNVERIFIED",
      );
    },
  );
  await scenario(
    "AI processing preserves accepted, rejected and revision-required human decisions and notifications",
    async () => {
      for (const [offset, decision] of ["ACCEPTED", "REJECTED", "REVISION_REQUIRED"].entries()) {
        const c = await context(6 + offset);
        const reference = await c.submit();
        await c.service.review(reference, "REVIEW_STARTED", c.adminId, null, null);
        await c.service.review(
          reference,
          decision as "ACCEPTED" | "REJECTED" | "REVISION_REQUIRED",
          c.adminId,
          decision === "ACCEPTED" ? null : "Synthetic human decision reason for testing.",
          "Human reviewer note",
        );
        const before = await c.service.getAdminDetail(reference);
        const emails = c.emails();
        await c.worker.runOne();
        assert.equal(c.calls(), 1);
        assert.deepEqual(await c.service.getAdminDetail(reference), before);
        assert.equal(c.emails(), emails);
      }
    },
  );
  await scenario("Disabled/unmarked submissions are not backfilled by reconciliation", async () => {
    const c = await context(9, { disabledQueue: true });
    await c.submit();
    assert.equal(await c.analysisRepo.reconcile!(), 0);
    await c.worker.runOne();
    assert.equal(c.calls(), 0);
    assert.equal(await c.count("abstract_ai_jobs"), 0);
  });
  await scenario("Budget reservation blocks Gemini before provider dispatch", async () => {
    const c = await context(10, { budget: 0.00001 });
    await c.submit();
    await c.worker.runOne();
    assert.equal(c.calls(), 0);
    assert.equal(await c.count("abstract_ai_attempts"), 0);
    assert.equal(
      (await c.pool.query("SELECT failure_code FROM abstract_ai_jobs")).rows[0].failure_code,
      "BUDGET_LIMIT",
    );
  });
  writeFileSync(
    resolve(output, "results.json"),
    JSON.stringify(
      {
        runId,
        engine: "PostgreSQL 18",
        isolatedDatabase: connection.database,
        externalRequests: 0,
        results,
      },
      null,
      2,
    ),
  );
  console.info(
    JSON.stringify({
      passed: results.filter((r) => r.status === "PASS").length,
      failed: results.filter((r) => r.status === "FAIL").length,
      externalRequests: 0,
    }),
  );
  if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
}
void main()
  .catch((error) => {
    console.error("Isolated PostgreSQL test failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });
