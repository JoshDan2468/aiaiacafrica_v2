/** Isolated local PostgreSQL acceptance. No environment DATABASE_URL/provider key is consumed. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { Pool } from "pg";
import { Router } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import {
  draftRubric,
  validateAnalysis,
  criterionKeys,
  type AnalysisResult,
} from "../src/abstracts/analysis";
import {
  AnalysisProviderError,
  OpenAiAnalysisProvider,
} from "../src/abstracts/openaiAnalysis.provider";
import {
  createAbstractAnalysisRepository,
  type AnalysisClaim,
} from "../src/repositories/abstractAnalysis.repository";
import { createAbstractSubmissionRepository } from "../src/repositories/abstractSubmission.repository";
import { AbstractAnalysisService } from "../src/services/abstractAnalysis.service";
import { AbstractSubmissionService } from "../src/services/abstractSubmission.service";
import { createAbstractSubmissionController } from "../src/controllers/abstractSubmission.controller";
import { createAbstractSubmissionRouter } from "../src/routes/abstractSubmission.routes";
import { EmailService } from "../src/email/email.service";
import type { AbstractAiConfig } from "../src/config/abstractAi";
import type { TransactionRunner } from "../src/types/database";
import type { AbstractSubmissionInput } from "../src/types/abstractSubmission";

const root = resolve(__dirname, "../..");
const output = resolve(root, "output/abstract-ai-acceptance");
const connection = {
  host: "127.0.0.1",
  port: 55437,
  user: "aiaiac_ai_test",
  database: "aiaiac_ai_acceptance",
  max: 16,
};
const config: AbstractAiConfig = {
  provider: "openai",
  apiKey: "synthetic-unused-key",
  model: "synthetic-model",
  rubric: draftRubric,
  maxAttempts: 3,
  maxConcurrent: 4,
  requestsPerMinute: 60,
  timeoutMs: 1000,
  maxInputTokens: 64000,
  maxOutputTokens: 2000,
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 10,
  dailyBudgetUsd: 100,
  totalBudgetUsd: 100,
};
const corpus = JSON.parse(
  readFileSync(resolve(root, "backend/test/fixtures/abstract-ai-synthetic.json"), "utf8"),
);
const runId = Date.now().toString(36);
const results: { name: string; status: "PASS" | "FAIL"; detail?: string }[] = [];
const pools: Pool[] = [];
let uiSnapshot: unknown;
const usage = { requestId: "synthetic-response", inputTokens: 2000, outputTokens: 800 };

async function guard(pool: Pool) {
  assert.equal(
    process.env.AIAIAC_AI_ACCEPTANCE_LOCAL,
    "true",
    "Explicit local acceptance flag required",
  );
  const row = (await pool.query("SHOW data_directory")).rows[0];
  const expected = resolve(root, ".private/abstract-ai-acceptance-20261014/cluster")
    .replaceAll("\\", "/")
    .toLowerCase();
  assert.equal(
    String(row.data_directory).replaceAll("\\", "/").toLowerCase(),
    expected,
    "Refusing to test any other database cluster",
  );
}
async function context(index: number, overrides: Partial<AbstractAiConfig> = {}) {
  const schema = `ai_acceptance_${runId}_${index}`;
  const migrationPool = new Pool(connection);
  await guard(migrationPool);
  const client = await migrationPool.connect();
  try {
    const { runner } = await import("node-pg-migrate");
    await runner({
      dbClient: client,
      dir: [
        resolve(root, "backend/migrations/20260820060315610_admin-authentication.ts"),
        resolve(root, "backend/migrations/20260922030000000_abstract-submissions.ts"),
        resolve(root, "backend/migrations/20261014010000000_abstract-ai-analysis.ts"),
      ],
      useGlob: true,
      schema,
      createSchema: true,
      migrationsTable: "pgmigrations",
      direction: "up",
      log: () => {},
    });
  } finally {
    client.release();
    await migrationPool.end();
  }
  const pool = new Pool({ ...connection, options: `-c search_path=${schema}` });
  pools.push(pool);
  const tx: TransactionRunner = async (work) => {
    const active = await pool.connect();
    try {
      await active.query("BEGIN");
      const value = await work(active);
      await active.query("COMMIT");
      return value;
    } catch (error) {
      await active.query("ROLLBACK");
      throw error;
    } finally {
      active.release();
    }
  };
  const analysis = createAbstractAnalysisRepository({ ...config, ...overrides }, pool, tx);
  const repository = createAbstractSubmissionRepository(pool, tx, (db, id, history) =>
    analysis.enqueue(db, id, history),
  );
  let now = Date.now();
  let emails = 0;
  const service = new AbstractSubmissionService(
    repository,
    new EmailService(
      {
        async send() {
          emails++;
        },
      },
      "http://127.0.0.1",
    ),
    new Date("2027-03-15T22:59:59Z"),
    24,
    30,
    () => new Date(now++),
  );
  const adminId = randomUUID();
  await pool.query(
    "INSERT INTO admins(id,full_name,email,password_hash,role) VALUES($1,'Synthetic reviewer',$2,'not-a-login-hash','ADMIN')",
    [adminId, `${adminId}@example.invalid`],
  );
  const input = (index = 0): AbstractSubmissionInput => ({
    idempotencyKey: randomBytes(32).toString("base64url"),
    authorFirstName: "Synthetic",
    authorLastName: "Author",
    authorEmail: `${randomUUID()}@example.invalid`,
    authorPhone: "+2348000000000",
    organizationName: "Synthetic Laboratory",
    country: "Nigeria",
    title: corpus[index].title,
    abstractBody: corpus[index].abstractBody,
    keywords: corpus[index].keywords,
    topic: "Digital Integrity & AI",
    consent: true,
  });
  const count = async (table: string) =>
    Number((await pool.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
  return {
    schema,
    pool,
    tx,
    analysis,
    repository,
    service,
    adminId,
    input,
    count,
    emails: () => emails,
  };
}
function referenceResult(claim: AnalysisClaim): AnalysisResult {
  const evidence = claim.content.abstractBody.split(". ")[0]!;
  return validateAnalysis(
    {
      summary: "Synthetic reference output for worker tests, not model evaluation.",
      categories: [
        { category: "Artificial Intelligence", explanation: "Hand-authored test response." },
      ],
      criteria: Object.fromEntries(
        criterionKeys.map((key) => [
          key,
          {
            score: 3,
            explanation: "Hand-authored assessment used solely for reliability tests.",
            evidence,
          },
        ]),
      ),
      issues: [],
      scoreExplanation: "The deterministic reference scores test weighted arithmetic only.",
    },
    claim.content,
    claim.rubric,
  );
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
  if (process.argv[2] === "--crash-work") {
    const schema = process.argv[3]!;
    assert.match(schema, /^ai_acceptance_[a-z0-9]+_\d+$/);
    const pool = new Pool({ ...connection, options: `-c search_path=${schema}` });
    await guard(pool);
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
    await new AbstractAnalysisService(createAbstractAnalysisRepository(config, pool, tx), {
      async analyze() {
        process.stdout.write("SYNTHETIC_PROVIDER_DISPATCHED\n");
        return new Promise(() => {});
      },
    }).runOne();
    return;
  }
  await scenario(
    "Actual migrations apply to a fresh isolated schema without historical backfill",
    async () => {
      const c = await context(1);
      assert.equal(await c.count("pgmigrations"), 3);
      assert.equal(await c.count("abstract_ai_jobs"), 0);
      assert.equal(await c.count("abstract_ai_results"), 0);
    },
  );
  await scenario(
    "Twelve concurrent submission retries persist exactly one submission, job, history and notification",
    async () => {
      const c = await context(2);
      const input = c.input();
      const confirmations = await Promise.all(
        Array.from({ length: 12 }, () => c.service.create(input)),
      );
      assert.equal(new Set(confirmations.map((item) => item.reference)).size, 1);
      assert.equal(confirmations.filter((item) => item.created).length, 1);
      for (const table of [
        "abstract_submissions",
        "abstract_ai_jobs",
        "abstract_submission_history",
        "abstract_notifications",
      ])
        assert.equal(await c.count(table), 1);
    },
  );
  await scenario(
    "Sixteen concurrent claimers respect global cap of four and never double claim a job",
    async () => {
      const c = await context(3);
      await Promise.all(Array.from({ length: 8 }, (_, i) => c.service.create(c.input(i))));
      const claims = (
        await Promise.all(Array.from({ length: 16 }, () => c.analysis.claim()))
      ).filter((item): item is AnalysisClaim => Boolean(item));
      assert.equal(claims.length, 4);
      assert.equal(new Set(claims.map((item) => item.id)).size, 4);
      assert.equal(await c.count("abstract_ai_attempts"), 4);
      await Promise.all(
        claims.map((item) => c.analysis.complete(item, referenceResult(item), usage)),
      );
      const next = (await Promise.all(Array.from({ length: 16 }, () => c.analysis.claim()))).filter(
        (item): item is AnalysisClaim => Boolean(item),
      );
      assert.equal(next.length, 4);
      assert.equal(new Set([...claims, ...next].map((item) => item.id)).size, 8);
      await Promise.all(
        next.map((item) => c.analysis.complete(item, referenceResult(item), usage)),
      );
      assert.equal(await c.count("abstract_ai_results"), 8);
      const page = await c.repository.list({ page: 1, pageSize: 20 });
      const views = await c.analysis.views(page.items.map((item) => item.reference));
      const reference = page.items[0]!.reference;
      uiSnapshot = {
        submissions: {
          ...page,
          items: page.items.map((item) => ({ ...item, aiAnalysis: views[item.reference] })),
        },
        submission: {
          ...(await c.repository.getAdminDetail(reference)),
          aiAnalysis: views[reference],
        },
      };
    },
  );
  await scenario("Concurrent duplicate enqueue calls preserve one unique job", async () => {
    const c = await context(4);
    await c.service.create(c.input());
    const row = (
      await c.pool.query("SELECT abstract_submission_id,source_history_id FROM abstract_ai_jobs")
    ).rows[0];
    await Promise.all(
      Array.from({ length: 10 }, () =>
        c.tx((client) =>
          c.analysis.enqueue(client, row.abstract_submission_id, row.source_history_id),
        ),
      ),
    );
    assert.equal(await c.count("abstract_ai_jobs"), 1);
  });
  await scenario(
    "Killed worker after synthetic provider dispatch retains reservation and fails uncertain without repeated dispatch",
    async () => {
      const c = await context(5);
      await c.service.create(c.input());
      const child = spawn(
        process.execPath,
        [
          resolve(root, "backend/node_modules/tsx/dist/cli.mjs"),
          __filename,
          "--crash-work",
          c.schema,
        ],
        {
          cwd: output,
          env: { ...process.env, AIAIAC_AI_ACCEPTANCE_LOCAL: "true" },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        },
      );
      await new Promise<void>((accept, reject) => {
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error("Crash worker did not dispatch"));
        }, 15000);
        child.stdout.on("data", (data) => {
          if (String(data).includes("SYNTHETIC_PROVIDER_DISPATCHED")) {
            clearTimeout(timer);
            accept();
          }
        });
        child.on("error", reject);
      });
      const exited = new Promise((accept) => child.on("exit", accept));
      child.kill("SIGKILL");
      await exited;
      assert.equal(await c.count("abstract_ai_attempts"), 1);
      await c.pool.query(
        "UPDATE abstract_ai_jobs SET lease_expires_at=CURRENT_TIMESTAMP-interval '1 second'",
      );
      assert.equal(await c.analysis.claim(), null);
      const row = (
        await c.pool.query("SELECT status,failure_code,retry_allowed FROM abstract_ai_jobs")
      ).rows[0];
      assert.deepEqual(row, {
        status: "FAILED",
        failure_code: "OUTCOME_UNKNOWN",
        retry_allowed: false,
      });
      assert.equal(await c.count("abstract_ai_attempts"), 1);
      assert.equal(
        (await c.pool.query("SELECT outcome FROM abstract_ai_attempts")).rows[0].outcome,
        "OUTCOME_UNKNOWN",
      );
    },
  );
  await scenario(
    "Real local HTTP timeout becomes uncertain and cannot trigger a second paid attempt",
    async () => {
      const c = await context(6);
      await c.service.create(c.input());
      let dispatches = 0;
      const server = createServer((req, res) => {
        dispatches++;
        req.resume();
        setTimeout(() => res.end("{}"), 1500);
      });
      await new Promise<void>((accept) => server.listen(0, "127.0.0.1", accept));
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const provider = new OpenAiAnalysisProvider(config, (_url, options) =>
        fetch(`http://127.0.0.1:${address.port}`, options),
      );
      try {
        const worker = new AbstractAnalysisService(c.analysis, provider);
        await worker.runOne();
        await worker.runOne();
        assert.equal(dispatches, 1);
        assert.equal(
          (await c.pool.query("SELECT failure_code FROM abstract_ai_jobs")).rows[0].failure_code,
          "OUTCOME_UNKNOWN",
        );
        assert.equal(await c.count("abstract_ai_attempts"), 1);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((accept) => server.close(() => accept()));
      }
    },
  );
  await scenario(
    "Provider outage retries with cooldown, recovers, and leaves submission successful",
    async () => {
      const c = await context(7);
      let calls = 0;
      const created = await c.service.create(c.input());
      const worker = new AbstractAnalysisService(c.analysis, {
        async analyze(content, rubric) {
          calls++;
          if (calls === 1) throw new AnalysisProviderError("PROVIDER_UNAVAILABLE", true);
          const { advisoryScore: _score, ...value } = referenceResult({
            content,
            rubric,
          } as AnalysisClaim);
          return { value, usage };
        },
      });
      await worker.runOne();
      assert.equal(await worker.runOne(), false);
      assert.equal(calls, 1);
      const retry = (
        await c.pool.query(
          "SELECT status,attempts,next_attempt_at>CURRENT_TIMESTAMP AS delayed FROM abstract_ai_jobs",
        )
      ).rows[0];
      assert.deepEqual(retry, { status: "QUEUED", attempts: 1, delayed: true });
      await c.pool.query(
        "UPDATE abstract_ai_jobs SET next_attempt_at=CURRENT_TIMESTAMP-interval '1 second'",
      );
      await worker.runOne();
      assert.equal(calls, 2);
      assert.equal((await c.repository.getAdminDetail(created.reference))?.status, "SUBMITTED");
      assert.equal(await c.count("abstract_ai_results"), 1);
      assert.equal(c.emails(), 1);
    },
  );
  await scenario("Retry exhaustion and manual retries share the same attempt cap", async () => {
    const c = await context(8);
    const created = await c.service.create(c.input());
    const worker = new AbstractAnalysisService(c.analysis, {
      async analyze() {
        throw new AnalysisProviderError("PROVIDER_RATE_LIMIT", true);
      },
    });
    for (let i = 0; i < 3; i++) {
      await c.pool.query(
        "UPDATE abstract_ai_jobs SET next_attempt_at=CURRENT_TIMESTAMP-interval '1 second'",
      );
      await worker.runOne();
    }
    assert.equal(await worker.runOne(), false);
    assert.equal(await c.analysis.retry(created.reference, c.adminId), false);
    assert.equal(await c.count("abstract_ai_attempts"), 3);
    assert.equal(
      (await c.pool.query("SELECT status FROM abstract_ai_jobs")).rows[0].status,
      "FAILED",
    );
  });
  await scenario(
    "Malformed result stays failed; authorized cooldown retry records the actor and can recover",
    async () => {
      const c = await context(9);
      const created = await c.service.create(c.input());
      await new AbstractAnalysisService(c.analysis, {
        async analyze() {
          return { value: { status: "ACCEPTED" }, usage };
        },
      }).runOne();
      assert.equal(await c.count("abstract_ai_results"), 0);
      assert.equal(await c.analysis.retry(created.reference, c.adminId), false);
      await c.pool.query(
        "UPDATE abstract_ai_jobs SET next_attempt_at=CURRENT_TIMESTAMP-interval '1 second'",
      );
      assert.equal(await c.analysis.retry(created.reference, c.adminId), true);
      const claim = (await c.analysis.claim())!;
      await c.analysis.complete(claim, referenceResult(claim), usage);
      assert.equal(
        (
          await c.pool.query(
            "SELECT admin_id FROM abstract_ai_events WHERE event_type='MANUAL_RETRY'",
          )
        ).rows[0].admin_id,
        c.adminId,
      );
      assert.equal((await c.repository.getAdminDetail(created.reference))?.status, "SUBMITTED");
    },
  );
  await scenario(
    "Human acceptance, rejection and revision decisions remain unchanged after successful analysis",
    async () => {
      const c = await context(10);
      for (const decision of ["ACCEPTED", "REJECTED", "REVISION_REQUIRED"] as const) {
        const created = await c.service.create(c.input());
        await c.service.review(created.reference, "REVIEW_STARTED", c.adminId, null, null);
        await c.service.review(
          created.reference,
          decision,
          c.adminId,
          decision === "ACCEPTED" ? null : "Synthetic human review explanation",
          null,
        );
        const before = await c.repository.getAdminDetail(created.reference);
        const emails = c.emails();
        const claim = (await c.analysis.claim())!;
        await c.analysis.complete(claim, referenceResult(claim), usage);
        const after = await c.repository.getAdminDetail(created.reference);
        assert.deepEqual(after, before);
        assert.equal(c.emails(), emails);
        assert.equal(after?.status, decision);
      }
    },
  );
  await scenario(
    "Resubmission during analysis discards the late result and queues one new source revision",
    async () => {
      const c = await context(11);
      const created = await c.service.create(c.input());
      const first = (await c.analysis.claim())!;
      await c.service.review(created.reference, "REVIEW_STARTED", c.adminId, null, null);
      await c.service.review(
        created.reference,
        "REVISION_REQUIRED",
        c.adminId,
        "Provide additional methodological details",
        null,
      );
      const auth = await c.service.authorize(created.reference, created.continuationToken);
      await c.service.updateRevision(auth, {
        title: "Revised synthetic forecasting study",
        abstractBody: corpus[1].abstractBody,
        keywords: "AI",
      });
      await c.service.resubmit(auth);
      assert.equal(await c.analysis.complete(first, referenceResult(first), usage), false);
      assert.equal(await c.count("abstract_ai_results"), 0);
      assert.equal(await c.count("abstract_ai_jobs"), 2);
      const views = await c.analysis.views([created.reference]);
      assert.equal(views[created.reference]?.status, "QUEUED");
      const next = (await c.analysis.claim())!;
      assert.notEqual(next.id, first.id);
      await c.analysis.complete(next, referenceResult(next), usage);
      assert.equal(
        (await c.analysis.views([created.reference]))[created.reference]?.status,
        "COMPLETED",
      );
    },
  );
  await scenario("Daily and total budget reservations prevent excess dispatch", async () => {
    for (const [index, overrides] of [
      [12, { dailyBudgetUsd: 0.15 }],
      [13, { totalBudgetUsd: 0.15 }],
    ] as const) {
      const c = await context(index, overrides);
      await c.service.create(c.input());
      await c.service.create(c.input(1));
      const claim = (await c.analysis.claim())!;
      await c.analysis.complete(claim, referenceResult(claim), usage);
      assert.equal(await c.analysis.claim(), null);
      assert.equal(await c.count("abstract_ai_attempts"), 1);
      assert.equal(
        (
          await c.pool.query(
            "SELECT count(*) AS n FROM abstract_ai_jobs WHERE failure_code='BUDGET_LIMIT'",
          )
        ).rows[0].n,
        "1",
      );
    }
  });
  await scenario(
    "Shared per-minute dispatch limit is enforced across simultaneous callers",
    async () => {
      const c = await context(14, { requestsPerMinute: 1 });
      await c.service.create(c.input());
      await c.service.create(c.input(1));
      const claims = await Promise.all([
        c.analysis.claim(),
        c.analysis.claim(),
        c.analysis.claim(),
      ]);
      assert.equal(claims.filter(Boolean).length, 1);
      assert.equal(await c.count("abstract_ai_attempts"), 1);
    },
  );
  await scenario(
    "Public HTTP submission completes before a failed AI provider request and remains retrievable",
    async () => {
      const c = await context(15);
      let calls = 0;
      const router = Router();
      router.use(
        createAbstractSubmissionRouter({
          controller: createAbstractSubmissionController(c.service),
          rateLimiter: (_req, _res, next) => next(),
        }),
      );
      const app = createApplication({
        apiRouter: router,
        requestLogger: (_req, _res, next) => next(),
      });
      const response = await request(app).post("/api/abstract-submissions").send(c.input());
      assert.equal(response.status, 201);
      assert.equal(calls, 0);
      await new AbstractAnalysisService(c.analysis, {
        async analyze() {
          calls++;
          throw new AnalysisProviderError("PROVIDER_UNAVAILABLE", true);
        },
      }).runOne();
      const auth = await c.service.authorize(
        response.body.data.reference,
        response.body.data.continuationToken,
      );
      assert.equal((await c.service.getWorkspace(auth))?.status, "SUBMITTED");
      assert.equal(calls, 1);
    },
  );
  await scenario(
    "Changed configuration blocks old jobs without provider calls or reservations",
    async () => {
      const c = await context(16);
      await c.service.create(c.input());
      const other = createAbstractAnalysisRepository(
        { ...config, model: "different-synthetic-model" },
        c.pool,
        c.tx,
      );
      assert.equal(await other.claim(), null);
      assert.equal(await c.count("abstract_ai_attempts"), 0);
      assert.equal(
        (await c.pool.query("SELECT failure_code FROM abstract_ai_jobs")).rows[0].failure_code,
        "CONFIG_CHANGED",
      );
    },
  );
  await scenario(
    "All twenty synthetic abstracts persist through the existing workflow without external inference",
    async () => {
      const c = await context(17);
      for (let i = 0; i < corpus.length; i++) {
        const response = await c.service.create(c.input(i));
        assert.equal(response.status, "SUBMITTED");
        assert.ok(response.wordCount <= 500);
      }
      assert.equal(await c.count("abstract_submissions"), 20);
      assert.equal(await c.count("abstract_ai_jobs"), 20);
      assert.equal(await c.count("abstract_ai_attempts"), 0);
    },
  );
  writeFileSync(
    resolve(output, "database-results.json"),
    JSON.stringify(
      {
        runId,
        engine: "PostgreSQL 18.6",
        host: "loopback-only isolated cluster",
        provider: "synthetic stubs/local timeout server only",
        results,
      },
      null,
      2,
    ),
  );
  writeFileSync(resolve(output, "admin-snapshot.json"), JSON.stringify(uiSnapshot, null, 2));
  console.info(
    JSON.stringify({
      passed: results.filter((item) => item.status === "PASS").length,
      failed: results.filter((item) => item.status === "FAIL").length,
    }),
  );
  if (results.some((item) => item.status === "FAIL")) process.exitCode = 1;
}
void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });
