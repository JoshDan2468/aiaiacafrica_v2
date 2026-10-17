import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createEnquiryController } from "../src/controllers/enquiry.controller";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { createEnquiryRateLimiter } from "../src/middleware/enquiryRateLimit.middleware";
import {
  EnquiryDuplicateKeyError,
  EnquiryTransitionConflictError,
  type EnquiryRepository,
} from "../src/repositories/enquiry.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createEnquiryRouter } from "../src/routes/enquiry.routes";
import { EnquiryService } from "../src/services/enquiry.service";
import type { AdminRole } from "../src/types/admin";
import type { EnquiryInput } from "../src/types/enquiry";
import { enquirySubmissionSchema } from "../src/validators/enquiry.validator";

const reference = "AIAIAC-ENQ-ABCD1234";
const input: EnquiryInput = {
  idempotencyKey: randomBytes(32).toString("base64url"),
  firstName: "Amina",
  lastName: "Okafor",
  email: "amina@example.com",
  category: "GENERAL",
  subject: "Conference question",
  message: "Please provide details about the conference venue and programme.",
};

function fixture(max = 100) {
  const sent: TransactionalEmail[] = [];
  const provider: EmailProvider = {
    async send(message) {
      sent.push(message);
    },
  };
  let record: {
    key: string;
    fingerprint: string;
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  } | null = null;
  let pending = true;
  const repository = {
    async create(
      enquiry: EnquiryInput,
      _reference: string,
      hash: string,
      fingerprint: string,
    ) {
      if (record) {
        if (record.key !== hash || record.fingerprint !== fingerprint)
          throw new EnquiryDuplicateKeyError();
        return {
          created: false,
          row: {
            reference,
            category: enquiry.category,
            subject: enquiry.subject,
            status: record.status,
            created_at: new Date("2026-09-23T10:00:00Z"),
          },
        };
      }
      record = { key: hash, fingerprint, status: "OPEN" };
      return {
        created: true,
        row: {
          reference,
          category: enquiry.category,
          subject: enquiry.subject,
          status: "OPEN",
          created_at: new Date("2026-09-23T10:00:00Z"),
        },
      };
    },
    async list() {
      return { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
    },
    async getDetail() {
      return { reference, status: record?.status ?? "OPEN", history: [] };
    },
    async transition(
      _reference: string,
      nextStatus: "IN_PROGRESS" | "RESOLVED" | "CLOSED",
    ) {
      if (!record || record.status === "CLOSED" || record.status === nextStatus)
        throw new EnquiryTransitionConflictError();
      record.status = nextStatus;
      return { reference, status: nextStatus };
    },
    async claimNotifications() {
      if (!pending) return [];
      pending = false;
      return [
        {
          id: "notification",
          recipientKind: "ACKNOWLEDGEMENT",
          email: input.email,
          name: "Amina Okafor",
          reference,
          category: input.category,
          subject: input.subject,
          sender: "Amina Okafor",
          submittedAt: new Date("2026-09-23T10:00:00Z"),
        },
      ];
    },
    async recordNotificationResult() {},
  } as unknown as EnquiryRepository;
  const service = new EnquiryService(
    repository,
    new EmailService(provider, "http://localhost:5173"),
    [],
    () => new Date("2026-09-23T10:00:00Z"),
    () => reference,
  );
  const controller = createEnquiryController(service);
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "00000000-0000-4000-8000-000000000001",
      role,
      fullName: "Test Admin",
      email: "admin@example.com",
    };
    next();
  };
  const router = Router();
  router.use(
    createEnquiryRouter({
      controller,
      rateLimiter: createEnquiryRateLimiter({ windowMs: 60_000, max }),
    }),
  );
  router.use(
    "/admin",
    createAdminRouter({ requireAuth, enquiryController: controller }),
  );
  return { app: createApplication({ apiRouter: router }), sent, service };
}

test("strict submission schema rejects unknown fields, invalid categories and short messages", () => {
  assert.equal(
    enquirySubmissionSchema.safeParse({ ...input, paymentStatus: "PAID" })
      .success,
    false,
  );
  assert.equal(
    enquirySubmissionSchema.safeParse({ ...input, status: "RESOLVED" }).success,
    false,
  );
  assert.equal(
    enquirySubmissionSchema.safeParse({ ...input, internalNote: "Injected" })
      .success,
    false,
  );
  assert.equal(
    enquirySubmissionSchema.safeParse({ ...input, email: "not-an-email" })
      .success,
    false,
  );
  assert.equal(
    enquirySubmissionSchema.safeParse({ ...input, category: "FINANCE" })
      .success,
    false,
  );
  assert.equal(
    enquirySubmissionSchema.safeParse({ ...input, message: "Too short" })
      .success,
    false,
  );
  assert.equal(
    enquirySubmissionSchema.safeParse({ ...input, message: "x".repeat(3001) })
      .success,
    false,
  );
});

test("public API returns safe reference, sends one acknowledgement and deduplicates retries", async () => {
  const { app, sent } = fixture();
  const first = await request(app)
    .post("/api/enquiries")
    .send(input)
    .expect(201);
  assert.equal(first.body.data.reference, reference);
  assert.equal(first.body.data.id, undefined);
  assert.equal(first.body.data.email, undefined);
  await request(app).post("/api/enquiries").send(input).expect(200);
  assert.equal(sent.length, 1);
  assert.match(sent[0]?.text ?? "", /AIAIAC 2027/);
  await request(app)
    .post("/api/enquiries")
    .send({ ...input, subject: "Changed subject" })
    .expect(409);
});

test("public API applies rate limiting and rejects malformed payloads", async () => {
  const { app } = fixture(1);
  await request(app)
    .post("/api/enquiries")
    .send({ ...input, message: "short" })
    .expect(400);
  await request(app).post("/api/enquiries").send(input).expect(429);
});

test("Admin enquiry routes enforce read/manage RBAC and stale conflicts", async () => {
  const { app } = fixture();
  await request(app).post("/api/enquiries").send(input).expect(201);
  await request(app).get("/api/admin/enquiries").expect(401);
  await request(app)
    .get("/api/admin/enquiries")
    .set("x-test-role", "FINANCE")
    .expect(403);
  await request(app)
    .get("/api/admin/enquiries")
    .set("x-test-role", "COMMUNICATIONS")
    .expect(200);
  await request(app)
    .post(`/api/admin/enquiries/${reference}/resolve`)
    .send({})
    .set("x-test-role", "FINANCE")
    .expect(403);
  await request(app)
    .post(`/api/admin/enquiries/${reference}/resolve`)
    .send({ note: "Handled" })
    .set("x-test-role", "COMMUNICATIONS")
    .expect(200);
  await request(app)
    .post(`/api/admin/enquiries/${reference}/resolve`)
    .send({})
    .set("x-test-role", "COMMUNICATIONS")
    .expect(409);
});
