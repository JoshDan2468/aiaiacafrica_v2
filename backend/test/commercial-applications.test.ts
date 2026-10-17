import assert from "node:assert/strict";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createCommercialApplicationController } from "../src/controllers/commercialApplication.controller";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { createCommercialApplicationRateLimiter } from "../src/middleware/commercialApplicationRateLimit.middleware";
import {
  CommercialApplicationNotFoundError,
  CommercialApplicationTransitionConflictError,
  type CommercialApplicationRepository,
} from "../src/repositories/commercialApplication.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createCommercialApplicationRouter } from "../src/routes/commercialApplication.routes";
import { CommercialApplicationService } from "../src/services/commercialApplication.service";
import type { AdminRole } from "../src/types/admin";
import type {
  CommercialApplicationDetail,
  CommercialApplicationInput,
  CommercialApplicationKind,
  CommercialApplicationStatus,
  CommercialNotificationClaim,
} from "../src/types/commercialApplication";

const prices = {
  TITLE: ["Title Sponsor", 10_000_000],
  STRATEGIC: ["Strategic Sponsor", 7_500_000],
  DIAMOND: ["Diamond Sponsor", 5_000_000],
  PLATINUM: ["Platinum Sponsor", 4_000_000],
  GOLD: ["Gold Sponsor", 3_000_000],
  SILVER: ["Silver Sponsor", 2_000_000],
  "9_SQM": ["9 sqm stand", 699_000],
  "18_SQM": ["18 sqm stand", 1_398_000],
  "36_SQM": ["36 sqm stand", 2_796_000],
} as const;

function fakeRepository(): CommercialApplicationRepository & {
  records: Map<string, CommercialApplicationDetail>;
  claims: CommercialNotificationClaim[];
} {
  const records = new Map<string, CommercialApplicationDetail>();
  const keys = new Map<string, string>();
  const claims: CommercialNotificationClaim[] = [];
  return {
    records,
    claims,
    async create(
      kind,
      input: CommercialApplicationInput,
      packageCode,
      reference,
      now,
    ) {
      const key = `${kind}:${packageCode}:${input.contactEmail}`;
      const existing = keys.get(key);
      if (existing) {
        const record = records.get(existing)!;
        return {
          created: false,
          kind,
          reference: record.reference,
          packageCode: record.packageCode,
          packageName: record.packageName,
          currency: "USD",
          priceMinor: record.priceMinor,
          status: record.status,
          nextStep:
            "Review follows; submission does not mean payment has been completed.",
        };
      }
      const selected = prices[packageCode as keyof typeof prices];
      if (!selected) throw new Error("unavailable");
      const [packageName, priceMinor] = selected;
      const detail: CommercialApplicationDetail = {
        kind,
        reference,
        organizationName: input.organizationName,
        contactName: `${input.contactFirstName} ${input.contactLastName}`,
        contactEmail: input.contactEmail,
        packageCode,
        packageName,
        currency: "USD",
        priceMinor,
        status: "SUBMITTED",
        submittedAt: now,
        country: input.country,
        website: input.website ?? null,
        industry: input.industry ?? null,
        contactFirstName: input.contactFirstName,
        contactLastName: input.contactLastName,
        contactPhone: input.contactPhone,
        contactJobTitle: input.contactJobTitle ?? null,
        applicantNotes: input.notes ?? null,
        currentApplicantReason: null,
        reviewedAt: null,
        reviewerName: null,
        history: [
          {
            id: "history-1",
            action: "SUBMITTED",
            fromStatus: null,
            toStatus: "SUBMITTED",
            reviewerName: null,
            applicantReason: null,
            internalNote: null,
            createdAt: now,
          },
        ],
      };
      records.set(reference, detail);
      keys.set(key, reference);
      claims.push({
        id: `${reference}-submitted`,
        kind,
        notificationType: "SUBMITTED",
        email: input.contactEmail,
        fullName: detail.contactName,
        organizationName: input.organizationName,
        reference,
        packageName,
        currency: "USD",
        priceMinor,
        applicantReason: null,
      });
      return {
        created: true,
        kind,
        reference,
        packageCode,
        packageName,
        currency: "USD",
        priceMinor,
        status: "SUBMITTED",
        nextStep:
          "Review follows; submission does not mean payment has been completed.",
      };
    },
    async list(kind, filters) {
      const values = [...records.values()].filter(
        (item) =>
          item.kind === kind &&
          (!filters.status || item.status === filters.status) &&
          (!filters.packageCode || item.packageCode === filters.packageCode) &&
          (!filters.search ||
            `${item.reference} ${item.organizationName} ${item.contactEmail}`
              .toLowerCase()
              .includes(filters.search.toLowerCase())),
      );
      return {
        items: values,
        page: filters.page,
        pageSize: filters.pageSize,
        total: values.length,
        totalPages: values.length ? 1 : 0,
      };
    },
    async getDetail(kind, reference) {
      const item = records.get(reference);
      return item?.kind === kind ? item : null;
    },
    async transition(
      kind,
      reference,
      nextStatus,
      _adminId,
      applicantReason,
      internalNote,
      now,
    ) {
      const item = records.get(reference);
      if (!item || item.kind !== kind)
        throw new CommercialApplicationNotFoundError();
      if (
        !["SUBMITTED", "MORE_INFORMATION_REQUIRED"].includes(item.status) ||
        item.status === nextStatus
      )
        throw new CommercialApplicationTransitionConflictError();
      const updated: CommercialApplicationDetail = {
        ...item,
        status: nextStatus,
        currentApplicantReason: applicantReason,
        reviewedAt: now,
        reviewerName: "Reviewer",
        history: [
          ...item.history,
          {
            id: `history-${item.history.length + 1}`,
            action: nextStatus,
            fromStatus: item.status,
            toStatus: nextStatus,
            reviewerName: "Reviewer",
            applicantReason,
            internalNote,
            createdAt: now,
          },
        ],
      };
      records.set(reference, updated);
      claims.push({
        id: `${reference}-${nextStatus}`,
        kind,
        notificationType: nextStatus,
        email: item.contactEmail,
        fullName: item.contactName,
        organizationName: item.organizationName,
        reference,
        packageName: item.packageName,
        currency: "USD",
        priceMinor: item.priceMinor,
        applicantReason,
      });
      return { reference, status: nextStatus, reviewedAt: now };
    },
    async claimNotifications(kind, reference) {
      return claims.filter(
        (claim) => claim.kind === kind && claim.reference === reference,
      );
    },
    async recordNotificationResult(_kind, notificationId) {
      const index = claims.findIndex((claim) => claim.id === notificationId);
      if (index >= 0) claims.splice(index, 1);
    },
  };
}

function fixture(max = 100) {
  const repository = fakeRepository();
  const sent: TransactionalEmail[] = [];
  const provider: EmailProvider = {
    async send(message) {
      sent.push(message);
    },
  };
  const service = new CommercialApplicationService(
    repository,
    new EmailService(provider, "http://localhost:5173"),
    () => new Date("2026-09-22T12:00:00Z"),
    (kind) =>
      kind === "SPONSOR" ? "AIAIAC-SPN-TEST0001" : "AIAIAC-EXH-TEST0001",
  );
  const controller = createCommercialApplicationController(service);
  const publicRouter = createCommercialApplicationRouter({
    controller,
    rateLimiter: createCommercialApplicationRateLimiter({
      windowMs: 60_000,
      max,
    }),
  });
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "10000000-0000-4000-8000-000000000001",
      fullName: "Reviewer",
      email: "reviewer@example.com",
      role,
      permissions: [],
    };
    next();
  };
  const router = Router();
  router.use(publicRouter);
  router.use(
    "/admin",
    createAdminRouter({
      requireAuth,
      commercialApplicationController: controller,
    }),
  );
  return { app: createApplication({ apiRouter: router }), repository, sent };
}

const sponsor = {
  organizationName: "Safe Energy Ltd",
  country: "Nigeria",
  contactFirstName: "Ada",
  contactLastName: "Okoro",
  contactEmail: "ada@safe.example",
  contactPhone: "+2348000000000",
  sponsorshipTier: "GOLD",
  consent: true,
};
const exhibitor = {
  organizationName: "Integrity Systems",
  country: "Ghana",
  contactFirstName: "Kojo",
  contactLastName: "Mensah",
  contactEmail: "kojo@integrity.example",
  contactPhone: "+233200000000",
  exhibitionOption: "18_SQM",
  consent: true,
};

test("Sponsor public submission is strict, server-priced, safe, and idempotent", async () => {
  const { app, sent } = fixture();
  const first = await request(app)
    .post("/api/sponsor-applications")
    .send({ ...sponsor, priceMinor: 1, status: "CONFIRMED" })
    .expect(400);
  assert.equal(first.body.success, false);
  const created = await request(app)
    .post("/api/sponsor-applications")
    .send(sponsor)
    .expect(201);
  assert.equal(created.body.data.status, "SUBMITTED");
  assert.equal(created.body.data.priceMinor, 3_000_000);
  assert.equal(created.body.data.currency, "USD");
  assert.equal(created.body.data.id, undefined);
  assert.equal(created.body.data.adminId, undefined);
  await request(app)
    .post("/api/sponsor-applications")
    .send(sponsor)
    .expect(200);
  assert.equal(sent.length, 1);
});

test("Sponsor rejects unknown tiers and invalid fields", async () => {
  const { app } = fixture();
  await request(app)
    .post("/api/sponsor-applications")
    .send({ ...sponsor, sponsorshipTier: "BRONZE" })
    .expect(400);
  await request(app)
    .post("/api/sponsor-applications")
    .send({ ...sponsor, contactEmail: "bad" })
    .expect(400);
});

test("Exhibitor resolves each authoritative stand value and rejects overrides", async () => {
  for (const [option, amount] of [
    ["9_SQM", 699_000],
    ["18_SQM", 1_398_000],
    ["36_SQM", 2_796_000],
  ] as const) {
    const { app } = fixture();
    const response = await request(app)
      .post("/api/exhibitor-applications")
      .send({ ...exhibitor, exhibitionOption: option })
      .expect(201);
    assert.equal(response.body.data.priceMinor, amount);
    assert.equal(response.body.data.currency, "USD");
  }
  const { app } = fixture();
  await request(app)
    .post("/api/exhibitor-applications")
    .send({ ...exhibitor, priceMinor: 1 })
    .expect(400);
  await request(app)
    .post("/api/exhibitor-applications")
    .send({ ...exhibitor, exhibitionOption: "72_SQM" })
    .expect(400);
});

test("Public commercial submission rate limit blocks automated repetition", async () => {
  const { app } = fixture(1);
  await request(app)
    .post("/api/sponsor-applications")
    .send(sponsor)
    .expect(201);
  await request(app)
    .post("/api/sponsor-applications")
    .send({ ...sponsor, contactEmail: "two@example.com" })
    .expect(429);
});

test("Admin list/detail enforce authentication and distinct read permissions", async () => {
  const { app } = fixture();
  await request(app).post("/api/sponsor-applications").send(sponsor);
  await request(app).get("/api/admin/sponsor-applications").expect(401);
  await request(app)
    .get("/api/admin/sponsor-applications")
    .set("x-test-role", "COMMUNICATIONS")
    .expect(403);
  const listed = await request(app)
    .get(
      "/api/admin/sponsor-applications?search=Safe&status=SUBMITTED&package=GOLD",
    )
    .set("x-test-role", "ADMIN")
    .expect(200);
  assert.equal(listed.body.data.applications.total, 1);
  await request(app)
    .get("/api/admin/sponsor-applications/AIAIAC-SPN-TEST0001")
    .set("x-test-role", "ADMIN")
    .expect(200);
});

test("Admin decisions require reasons, preserve history, and are concurrency safe", async () => {
  const { app, repository } = fixture();
  await request(app).post("/api/sponsor-applications").send(sponsor);
  const base = "/api/admin/sponsor-applications/AIAIAC-SPN-TEST0001";
  await request(app)
    .post(`${base}/request-more-information`)
    .set("x-test-role", "ADMIN")
    .send({ reason: "short" })
    .expect(400);
  await request(app)
    .post(`${base}/decline`)
    .set("x-test-role", "ADMIN")
    .send({})
    .expect(400);
  await request(app)
    .post(`${base}/request-more-information`)
    .set("x-test-role", "ADMIN")
    .set("Origin", "http://localhost:5173")
    .set("X-AIAIAC-CSRF", "1")
    .send({ reason: "Please provide the legal company registration name." })
    .expect(200);
  await request(app)
    .post(`${base}/confirm`)
    .set("x-test-role", "ADMIN")
    .set("Origin", "http://localhost:5173")
    .set("X-AIAIAC-CSRF", "1")
    .send({ note: "Commercial committee approved." })
    .expect(200);
  await request(app)
    .post(`${base}/decline`)
    .set("x-test-role", "ADMIN")
    .set("Origin", "http://localhost:5173")
    .set("X-AIAIAC-CSRF", "1")
    .send({ reason: "A conflicting late decision must not commit." })
    .expect(409);
  assert.equal(
    repository.records.get("AIAIAC-SPN-TEST0001")?.status,
    "CONFIRMED",
  );
  assert.equal(
    repository.records.get("AIAIAC-SPN-TEST0001")?.history.length,
    3,
  );
});

test("Exhibitor Admin confirmation is protected and terminal", async () => {
  const { app } = fixture();
  await request(app).post("/api/exhibitor-applications").send(exhibitor);
  const base = "/api/admin/exhibitor-applications/AIAIAC-EXH-TEST0001";
  await request(app)
    .post(`${base}/confirm`)
    .set("x-test-role", "FINANCE")
    .send({})
    .expect(403);
  await request(app)
    .post(`${base}/confirm`)
    .set("x-test-role", "REGISTRATION_MANAGER")
    .send({})
    .expect(200);
  await request(app)
    .post(`${base}/decline`)
    .set("x-test-role", "REGISTRATION_MANAGER")
    .send({
      reason: "This stale action must not replace the confirmed decision.",
    })
    .expect(409);
});

test("Applicant email includes AIAIAC reference, organization, package, value, and no internal note", async () => {
  const { app, sent } = fixture();
  await request(app).post("/api/sponsor-applications").send(sponsor);
  const base = "/api/admin/sponsor-applications/AIAIAC-SPN-TEST0001";
  await request(app)
    .post(`${base}/confirm`)
    .set("x-test-role", "ADMIN")
    .send({ note: "INTERNAL-ONLY-NOTE" })
    .expect(200);
  const text = sent.map((mail) => mail.text).join("\n");
  assert.match(text, /AIAIAC 2027/);
  assert.match(text, /AIAIAC-SPN-TEST0001/);
  assert.match(text, /Safe Energy Ltd/);
  assert.match(text, /Gold Sponsor/);
  assert.match(text, /\$30,000/);
  assert.doesNotMatch(text, /INTERNAL-ONLY-NOTE/);
});
