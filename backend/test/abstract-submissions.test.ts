import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { countAbstractWords } from "../src/abstracts/wordCount";
import { createAbstractSubmissionController } from "../src/controllers/abstractSubmission.controller";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { abstractSubmissionTemplate } from "../src/email/templates/abstractSubmission.template";
import { createAbstractSubmissionRateLimiter } from "../src/middleware/abstractSubmissionRateLimit.middleware";
import {
  AbstractAuthorizationError,
  type AbstractSubmissionRepository,
} from "../src/repositories/abstractSubmission.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createAbstractSubmissionRouter } from "../src/routes/abstractSubmission.routes";
import {
  AbstractSubmissionService,
  hashAbstractToken,
} from "../src/services/abstractSubmission.service";
import type { AdminRole } from "../src/types/admin";
import { abstractSubmissionSchema } from "../src/validators/abstractSubmission.validator";

const reference = "AIAIAC-ABS-ABCD1234";
const key = randomBytes(32).toString("base64url");
const base = {
  idempotencyKey: key,
  authorFirstName: "Ada",
  authorLastName: "Author",
  authorEmail: "ada@example.com",
  authorPhone: "+2348000000000",
  organizationName: "Research Centre",
  country: "Nigeria",
  title: "Integrity monitoring in practice",
  abstractBody:
    "This paper explains practical asset integrity monitoring and lessons from engineering field operations.",
  consent: true,
};

function fixture(options: { deadline?: Date; max?: number } = {}) {
  const records = new Map<string, Record<string, unknown>>();
  const sent: TransactionalEmail[] = [];
  const provider: EmailProvider = {
    async send(message) {
      sent.push(message);
    },
  };
  const repository = {
    async findBySubmissionKey(hash: string) {
      return records.get(hash) ?? null;
    },
    async create(
      input: typeof base,
      _reference: string,
      wordCount: number,
      fingerprint: string,
      keyHash: string,
      expiresAt: Date,
      now: Date,
    ) {
      const row = {
        id: "abstract-internal-id",
        reference,
        title: input.title,
        abstract_body: input.abstractBody,
        author_email: input.authorEmail,
        content_fingerprint: fingerprint,
        continuation_token_hash: keyHash,
        continuation_token_expires_at: expiresAt,
        word_count: wordCount,
        status: "SUBMITTED",
        submitted_at: now,
      };
      records.set(keyHash, row);
      return { created: true, row };
    },
    async authorize(target: string, hash: string, now: Date) {
      const row = records.get(hash);
      if (
        target !== reference ||
        !row ||
        (row.continuation_token_expires_at as Date) <= now
      )
        throw new AbstractAuthorizationError();
      return "abstract-internal-id";
    },
    async getPublicState() {
      return { reference, status: "SUBMITTED" };
    },
    async list() {
      return { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
    },
    async getAdminDetail() {
      return { reference, status: "SUBMITTED", history: [] };
    },
    async review() {
      return { reference, status: "UNDER_REVIEW" };
    },
    async claimNotifications() {
      return [];
    },
    async createRecovery() {
      return null;
    },
  } as unknown as AbstractSubmissionRepository;
  const service = new AbstractSubmissionService(
    repository,
    new EmailService(provider, "http://localhost:5173"),
    options.deadline ?? new Date("2027-03-15T22:59:59Z"),
    24,
    30,
    () => new Date("2026-09-22T12:00:00Z"),
    () => reference,
  );
  const controller = createAbstractSubmissionController(service);
  const publicRouter = createAbstractSubmissionRouter({
    controller,
    rateLimiter: createAbstractSubmissionRateLimiter({
      windowMs: 60_000,
      max: options.max ?? 100,
    }),
  });
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "reviewer",
      role,
      fullName: "Reviewer",
      email: "reviewer@example.com",
    };
    next();
  };
  const router = Router();
  router.use(publicRouter);
  router.use(
    "/admin",
    createAdminRouter({
      requireAuth,
      abstractSubmissionController: controller,
    }),
  );
  return {
    app: createApplication({ apiRouter: router }),
    service,
    repository,
    records,
    sent,
  };
}

test("word rule accepts exactly 500 whitespace-delimited words and rejects 501", () => {
  const fiveHundred = Array(500).fill("word").join(" \n");
  assert.equal(countAbstractWords(fiveHundred), 500);
  assert.equal(
    abstractSubmissionSchema.safeParse({ ...base, abstractBody: fiveHundred })
      .success,
    true,
  );
  assert.equal(
    abstractSubmissionSchema.safeParse({
      ...base,
      abstractBody: `${fiveHundred} extra`,
    }).success,
    false,
  );
});

test("strict public validation rejects browser status, reviewer and arbitrary fields", () => {
  for (const field of ["status", "reviewerId", "paymentStatus", "unexpected"]) {
    assert.equal(
      abstractSubmissionSchema.safeParse({ ...base, [field]: "ACCEPTED" })
        .success,
      false,
    );
  }
});

test("abstract document uploads fail closed for PDF, DOCX and spoofed files", async () => {
  const { app, records, sent } = fixture();
  for (const file of [
    {
      name: "abstract.pdf",
      type: "application/pdf",
      bytes: "%PDF-1.7\nfixture",
    },
    {
      name: "abstract.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: "PK\x03\x04fixture",
    },
    {
      name: "renamed.pdf",
      type: "application/pdf",
      bytes: "<script>not a PDF</script>",
    },
    {
      name: "malicious.exe",
      type: "application/octet-stream",
      bytes: "MZfixture",
    },
  ]) {
    const response = await request(app)
      .post("/api/abstract-submissions")
      .field("title", base.title)
      .attach("document", Buffer.from(file.bytes), {
        filename: file.name,
        contentType: file.type,
      });
    assert.equal(response.status, 415);
    assert.match(response.body.message, /document uploads are unavailable/i);
  }
  for (const type of ["application/pdf", "application/octet-stream"]) {
    assert.equal(
      (
        await request(app)
          .post("/api/abstract-submissions")
          .set("Content-Type", type)
          .send(Buffer.from("fixture"))
      ).status,
      415,
    );
  }
  assert.equal(records.size, 0);
  assert.equal(sent.length, 0);
});

test("text submissions reject embedded attachment fields without creating records", async () => {
  const { app, records } = fixture();
  for (const field of ["document", "attachment", "file", "documentUrl"]) {
    const response = await request(app)
      .post("/api/abstract-submissions")
      .send({ ...base, [field]: "%PDF-1.7 fixture" });
    assert.equal(response.status, 400);
  }
  assert.equal(records.size, 0);
});

test("author revisions and resubmissions cannot bypass the disabled upload gate", async () => {
  const { app, records } = fixture();
  await request(app).post("/api/abstract-submissions").send(base);
  const original = JSON.stringify([...records.values()]);
  for (const operation of ["revision", "resubmit"] as const) {
    const operationRequest =
      operation === "revision"
        ? request(app).patch(
            `/api/abstract-submissions/${reference}/${operation}`,
          )
        : request(app).post(
            `/api/abstract-submissions/${reference}/${operation}`,
          );
    const response = await operationRequest
      .set("X-AIAIAC-Continuation-Token", key)
      .attach("document", Buffer.from("%PDF-1.7 fixture"), "abstract.pdf");
    assert.equal(response.status, 415);
  }
  assert.equal(JSON.stringify([...records.values()]), original);
});

test("public create calculates count, excludes UUID, and safely handles repeated key", async () => {
  const { app, records } = fixture();
  const first = await request(app).post("/api/abstract-submissions").send(base);
  assert.equal(first.status, 201);
  assert.equal(first.body.data.reference, reference);
  assert.equal(
    first.body.data.wordCount,
    countAbstractWords(base.abstractBody),
  );
  assert.equal(first.body.data.id, undefined);
  const again = await request(app).post("/api/abstract-submissions").send(base);
  assert.equal(again.status, 200);
  assert.equal(records.size, 1);
});

test("a different abstract by the same author is permitted with a different key", async () => {
  const { app, records } = fixture();
  await request(app).post("/api/abstract-submissions").send(base);
  const other = await request(app)
    .post("/api/abstract-submissions")
    .send({
      ...base,
      idempotencyKey: randomBytes(32).toString("base64url"),
      title: "A distinct research proposal",
    });
  assert.equal(other.status, 201);
  assert.equal(records.size, 2);
});

test("deadline is backend-enforced for new submissions", async () => {
  const { app } = fixture({ deadline: new Date("2026-01-01T00:00:00Z") });
  assert.equal(
    (await request(app).post("/api/abstract-submissions").send(base)).status,
    410,
  );
});

test("an unchanged retry remains idempotent after the deadline, but key reuse with new content conflicts", async () => {
  const { service, repository } = fixture();
  const first = await service.create(base as never);
  const lateService = new AbstractSubmissionService(
    repository,
    new EmailService(null, "http://localhost:5173"),
    new Date("2026-01-01T00:00:00Z"),
    24,
    30,
    () => new Date("2026-09-22T12:00:00Z"),
    () => reference,
  );
  const retry = await lateService.create(base as never);
  assert.equal(retry.created, false);
  assert.equal(retry.reference, first.reference);
  await assert.rejects(() =>
    lateService.create({
      ...base,
      title: "A new title on an old key",
    } as never),
  );
});

test("reference alone and wrong ownership token cannot open author workspace", async () => {
  const { app } = fixture();
  await request(app).post("/api/abstract-submissions").send(base);
  assert.equal(
    (await request(app).get(`/api/abstract-submissions/${reference}/workspace`))
      .status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .get(`/api/abstract-submissions/${reference}/workspace`)
        .set(
          "X-AIAIAC-Continuation-Token",
          randomBytes(32).toString("base64url"),
        )
    ).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .get(`/api/abstract-submissions/${reference}/workspace`)
        .set("X-AIAIAC-Continuation-Token", key)
    ).status,
    200,
  );
});

test("revision endpoint applies authoritative 500-word validation", async () => {
  const { app } = fixture();
  await request(app).post("/api/abstract-submissions").send(base);
  const tooLong = Array(501).fill("word").join(" ");
  const response = await request(app)
    .patch(`/api/abstract-submissions/${reference}/revision`)
    .set("X-AIAIAC-Continuation-Token", key)
    .send({ title: "A revised title", abstractBody: tooLong });
  assert.equal(response.status, 400);
});

test("recovery response does not enumerate and public limiter returns 429", async () => {
  const { app } = fixture({ max: 2 });
  const body = { reference, email: "unknown@example.com" };
  const a = await request(app)
    .post("/api/abstract-submission-recovery/request")
    .send(body);
  const b = await request(app)
    .post("/api/abstract-submission-recovery/request")
    .send({ ...body, email: "other@example.com" });
  assert.equal(a.status, 202);
  assert.equal(b.status, 202);
  assert.equal(a.body.message, b.body.message);
  assert.equal(
    (
      await request(app)
        .post("/api/abstract-submission-recovery/request")
        .send(body)
    ).status,
    429,
  );
});

test("Admin Abstract routes enforce session and least-privilege review role", async () => {
  const { app } = fixture();
  assert.equal(
    (await request(app).get("/api/admin/abstract-submissions")).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/admin/abstract-submissions")
        .set("x-test-role", "FINANCE")
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/admin/abstract-submissions")
        .set("x-test-role", "REGISTRATION_MANAGER")
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/admin/abstract-submissions/${reference}/start-review`)
        .set("x-test-role", "REGISTRATION_MANAGER")
        .send({})
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post(`/api/admin/abstract-submissions/${reference}/start-review`)
        .set("x-test-role", "ADMIN")
        .send({})
    ).status,
    200,
  );
});

test("review reason validation is mandatory for revision and rejection", async () => {
  const { app } = fixture();
  for (const action of ["request-revision", "reject"]) {
    assert.equal(
      (
        await request(app)
          .post(`/api/admin/abstract-submissions/${reference}/${action}`)
          .set("x-test-role", "ADMIN")
          .send({})
      ).status,
      400,
    );
    assert.equal(
      (
        await request(app)
          .post(`/api/admin/abstract-submissions/${reference}/${action}`)
          .set("x-test-role", "ADMIN")
          .send({ reason: "Too short" })
      ).status,
      400,
    );
  }
});

test("notification copy contains the decision reason and never offers payment", () => {
  const common = {
    email: "ada@example.com",
    fullName: "Ada Author",
    reference,
    title: base.title,
    authorVisibleReason: "Please clarify the methodology.",
    notificationType: "REVISION_REQUIRED" as const,
  };
  const revision = abstractSubmissionTemplate(
    common,
    "https://example.com/registration/abstract#recoveryToken=opaque",
  );
  assert.match(revision.text, /Please clarify the methodology/);
  assert.match(revision.text, /AIAIAC 2027/);
  const accepted = abstractSubmissionTemplate({
    ...common,
    notificationType: "ACCEPTED",
  });
  assert.match(accepted.text, /fee remains TBA/);
  assert.doesNotMatch(accepted.text, /payment is available|Event Pass/i);
  const rejected = abstractSubmissionTemplate({
    ...common,
    notificationType: "REJECTED",
  });
  assert.match(rejected.text, /Please clarify the methodology/);
  assert.equal(hashAbstractToken(key).length, 64);
  assert.notEqual(hashAbstractToken(key), key);
});
