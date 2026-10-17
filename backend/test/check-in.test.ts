import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createCheckInController } from "../src/controllers/checkIn.controller";
import { createEventPassCredential } from "../src/eventPass/eventPassCredential";
import type { CreateAuditLogInput } from "../src/repositories/adminAudit.repository";
import {
  evaluateCheckIn,
  type CheckInCandidate,
  type CheckInRepository,
} from "../src/repositories/checkIn.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { CheckInService } from "../src/services/checkIn.service";
import type { AdminRole } from "../src/types/admin";

const candidate = (
  changes: Partial<CheckInCandidate> = {},
): CheckInCandidate => ({
  registrationId: randomUUID(),
  eventPassId: randomUUID(),
  name: "Synthetic Attendee",
  registrationReference: "AIAIAC-DEL-P09TEST01",
  category: "PROFESSIONAL",
  registrationStatus: "SUBMITTED",
  emailVerificationStatus: "VERIFIED",
  paymentStatus: "PAID",
  eventPassStatus: "ACTIVE",
  studentVerificationStatus: null,
  authoritativePaymentStatus: "PAID",
  financialAuthority: "AUTHORITATIVE",
  checkedInAt: null,
  ...changes,
});

function context() {
  const credential = createEventPassCredential();
  const current = candidate();
  const audits: CreateAuditLogInput[] = [];
  const hashes: string[] = [];
  const confirms: Parameters<CheckInRepository["confirm"]>[] = [];
  let admissions = 0;
  const now = new Date("2027-04-19T09:00:00.000Z");
  const repository: CheckInRepository = {
    async findByCredentialHash(hash) {
      hashes.push(hash);
      return hash === credential.hash ? current : null;
    },
    async lookup(query) {
      return query.toUpperCase() === current.registrationReference
        ? [current]
        : [];
    },
    async confirm(...args) {
      confirms.push(args);
      const [selector] = args;
      if (
        "credentialHash" in selector &&
        selector.credentialHash !== credential.hash
      ) {
        return evaluateCheckIn(null);
      }
      const result = evaluateCheckIn(current);
      if (result.status !== "VALID_ACTIVE_PASS") return result;
      admissions += 1;
      const saved = { ...current, checkedInAt: now };
      Object.assign(current, saved);
      return { ...evaluateCheckIn(saved), status: "CHECKED_IN" };
    },
    async recent() {
      return admissions
        ? [
            {
              name: current.name,
              registrationReference: current.registrationReference,
              category: current.category,
              checkedInAt: now,
              method: "QR",
              staffName: "Synthetic Staff",
            },
          ]
        : [];
    },
    async count() {
      return { today: admissions, total: admissions };
    },
  };
  const service = new CheckInService(
    repository,
    {
      async create(input) {
        audits.push(input);
      },
    },
    () => now,
  );
  return {
    credential,
    current,
    audits,
    hashes,
    confirms,
    service,
    admissions: () => admissions,
  };
}

test("active paid Professional pass validates with a safe operational projection", () => {
  const result = evaluateCheckIn(candidate());
  assert.equal(result.status, "VALID_ACTIVE_PASS");
  assert.deepEqual(
    Object.keys(result.attendee!).sort(),
    [
      "category",
      "emailVerificationStatus",
      "eventPassStatus",
      "name",
      "paymentStatus",
      "registrationReference",
      "studentVerificationStatus",
    ].sort(),
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /registrationId|eventPassId|financialAuthority|credential|hash|token/i,
  );
});

test("approved paid Student pass validates", () => {
  assert.equal(
    evaluateCheckIn(
      candidate({ category: "STUDENT", studentVerificationStatus: "APPROVED" }),
    ).status,
    "VALID_ACTIVE_PASS",
  );
});

for (const [label, changes, expected] of [
  ["revoked pass", { eventPassStatus: "REVOKED" }, "INACTIVE_PASS"],
  [
    "unpaid registration",
    { paymentStatus: "PENDING" },
    "REGISTRATION_NOT_ELIGIBLE",
  ],
  [
    "Student awaiting approval",
    { category: "STUDENT", studentVerificationStatus: "PENDING" },
    "REGISTRATION_NOT_ELIGIBLE",
  ],
  [
    "unverified email",
    { emailVerificationStatus: "UNVERIFIED" },
    "REGISTRATION_NOT_ELIGIBLE",
  ],
  [
    "cancelled registration",
    { registrationStatus: "CANCELLED" },
    "REGISTRATION_NOT_ELIGIBLE",
  ],
  [
    "missing authoritative payment",
    { authoritativePaymentStatus: null, financialAuthority: null },
    "REGISTRATION_NOT_ELIGIBLE",
  ],
  [
    "non-authoritative success",
    { financialAuthority: "NON_AUTHORITATIVE" },
    "REGISTRATION_NOT_ELIGIBLE",
  ],
  [
    "missing pass",
    { eventPassId: null, eventPassStatus: "NOT_ISSUED" },
    "REGISTRATION_NOT_ELIGIBLE",
  ],
  [
    "financial reconciliation",
    { authoritativePaymentStatus: "RECONCILIATION_REQUIRED" },
    "RECONCILIATION_REQUIRED",
  ],
  [
    "reversed payment",
    { authoritativePaymentStatus: "REVERSED" },
    "RECONCILIATION_REQUIRED",
  ],
  [
    "refunded registration",
    { paymentStatus: "REFUNDED" },
    "RECONCILIATION_REQUIRED",
  ],
] as const) {
  test(`${label} cannot be admitted automatically`, () => {
    const state = candidate(changes);
    assert.equal(evaluateCheckIn(state).status, expected);
    assert.equal(state.eventPassStatus, changes.eventPassStatus ?? "ACTIVE");
  });
}

test("an existing admission returns its original timestamp even if later eligibility changes", () => {
  const checkedInAt = new Date("2027-04-19T08:00:00.000Z");
  const result = evaluateCheckIn(
    candidate({ checkedInAt, eventPassStatus: "REVOKED" }),
  );
  assert.equal(result.status, "ALREADY_CHECKED_IN");
  assert.equal(result.checkedInAt, checkedInAt);
});

test("random and modified opaque credentials are rejected; raw credentials never reach persistence or audit", async () => {
  const fixture = context();
  assert.equal(
    (await fixture.service.validate(createEventPassCredential().raw, "staff-1"))
      .status,
    "INVALID_PASS",
  );
  const modified = `${fixture.credential.raw.slice(0, -1)}${fixture.credential.raw.endsWith("A") ? "B" : "A"}`;
  assert.equal(
    (await fixture.service.validate(modified, "staff-1")).status,
    "INVALID_PASS",
  );
  const result = await fixture.service.validate(
    fixture.credential.raw,
    "staff-1",
  );
  assert.equal(result.status, "VALID_ACTIVE_PASS");
  assert.equal(fixture.hashes.at(-1), fixture.credential.hash);
  const serialized = JSON.stringify({ result, audits: fixture.audits });
  assert.ok(!serialized.includes(fixture.credential.raw));
  assert.ok(!serialized.includes(fixture.credential.hash));
  assert.ok(fixture.audits.some((item) => item.action === "PASS_VALIDATED"));
  assert.ok(fixture.audits.some((item) => item.action === "CHECK_IN_DENIED"));
});

test("manual lookup only returns the attendee and never invokes admission", async () => {
  const fixture = context();
  const lookup = await fixture.service.lookup(
    fixture.current.registrationReference,
    "staff-1",
  );
  assert.equal(lookup.matches[0]?.status, "VALID_ACTIVE_PASS");
  assert.equal(fixture.confirms.length, 0);
  assert.equal(fixture.admissions(), 0);
  assert.ok(
    fixture.audits.some((item) => item.action === "MANUAL_ATTENDEE_LOOKUP"),
  );
});

test("explicit QR and manual confirmation use the same repository eligibility boundary", async () => {
  const qr = context();
  assert.equal(
    (
      await qr.service.confirm(
        { method: "QR", credential: qr.credential.raw },
        "staff-1",
      )
    ).status,
    "CHECKED_IN",
  );
  assert.deepEqual(qr.confirms[0]?.[0], { credentialHash: qr.credential.hash });
  assert.equal(qr.confirms[0]?.[1], "QR");
  const manual = context();
  assert.equal(
    (
      await manual.service.confirm(
        {
          method: "MANUAL_LOOKUP",
          registrationReference: manual.current.registrationReference,
        },
        "staff-2",
      )
    ).status,
    "CHECKED_IN",
  );
  assert.deepEqual(manual.confirms[0]?.[0], {
    registrationReference: manual.current.registrationReference,
  });
  assert.equal(manual.confirms[0]?.[1], "MANUAL_LOOKUP");
});

function application(fixture = context(), mutationSecurity?: RequestHandler) {
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "staff-1",
      fullName: "Synthetic Staff",
      email: "staff@example.test",
      role,
      permissions: [],
    };
    next();
  };
  const api = Router();
  api.use(
    "/admin",
    createAdminRouter({
      requireAuth,
      ...(mutationSecurity ? { mutationSecurity } : {}),
      checkInController: createCheckInController(fixture.service),
    }),
  );
  return { app: createApplication({ apiRouter: api }), fixture };
}

test("check-in endpoints enforce authentication and deny Finance/Communications server-side", async () => {
  const { app } = application();
  const endpoints = [
    {
      path: "/validate",
      body: { credential: createEventPassCredential().raw },
    },
    { path: "/lookup", body: { query: "AIAIAC-DEL-P09TEST01" } },
    {
      path: "/confirm",
      body: {
        method: "MANUAL_LOOKUP",
        registrationReference: "AIAIAC-DEL-P09TEST01",
      },
    },
  ];
  for (const endpoint of endpoints) {
    await request(app)
      .post(`/api/admin/check-in${endpoint.path}`)
      .send(endpoint.body)
      .expect(401);
    for (const role of ["FINANCE", "COMMUNICATIONS"]) {
      await request(app)
        .post(`/api/admin/check-in${endpoint.path}`)
        .set("x-test-role", role)
        .send(endpoint.body)
        .expect(403);
    }
  }
  for (const path of ["/recent", "/count"]) {
    await request(app).get(`/api/admin/check-in${path}`).expect(401);
    for (const role of ["FINANCE", "COMMUNICATIONS"]) {
      await request(app)
        .get(`/api/admin/check-in${path}`)
        .set("x-test-role", role)
        .expect(403);
    }
  }
});

test("Super Admin, Admin and Registration Manager have operational check-in access", async () => {
  for (const role of ["SUPER_ADMIN", "ADMIN", "REGISTRATION_MANAGER"]) {
    const { app, fixture } = application();
    const validated = await request(app)
      .post("/api/admin/check-in/validate")
      .set("x-test-role", role)
      .send({ credential: fixture.credential.raw })
      .expect(200);
    assert.equal(validated.body.data.status, "VALID_ACTIVE_PASS");
    const first = await request(app)
      .post("/api/admin/check-in/confirm")
      .set("x-test-role", role)
      .send({ method: "QR", credential: fixture.credential.raw })
      .expect(200);
    assert.equal(first.body.data.status, "CHECKED_IN");
    const again = await request(app)
      .post("/api/admin/check-in/validate")
      .set("x-test-role", role)
      .send({ credential: fixture.credential.raw })
      .expect(200);
    assert.equal(again.body.data.status, "ALREADY_CHECKED_IN");
    assert.equal(again.body.data.checkedInAt, first.body.data.checkedInAt);
    assert.ok(!JSON.stringify(first.body).includes(fixture.credential.raw));
    assert.ok(!JSON.stringify(first.body).includes(fixture.credential.hash));
  }
});

test("malformed requests and unbounded recent limits are rejected", async () => {
  const { app } = application();
  for (const body of [
    {},
    { credential: "" },
    { credential: 123 },
    { credential: "x".repeat(513) },
  ]) {
    await request(app)
      .post("/api/admin/check-in/validate")
      .set("x-test-role", "ADMIN")
      .send(body)
      .expect(400);
  }
  await request(app)
    .post("/api/admin/check-in/confirm")
    .set("x-test-role", "ADMIN")
    .send({ method: "QR", registrationReference: "AIAIAC-DEL-P09TEST01" })
    .expect(400);
  await request(app)
    .get("/api/admin/check-in/recent?limit=10000")
    .set("x-test-role", "ADMIN")
    .expect(400);
});

test("QR request logging, API responses and audit records conceal credential and hash", async () => {
  const { app, fixture } = application();
  const logs: unknown[][] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    const response = await request(app)
      .post("/api/admin/check-in/validate")
      .set("x-test-role", "ADMIN")
      .send({ credential: fixture.credential.raw })
      .expect(200);
    const serialized = JSON.stringify({
      logs,
      response: response.body,
      audits: fixture.audits,
    });
    assert.ok(!serialized.includes(fixture.credential.raw));
    assert.ok(!serialized.includes(fixture.credential.hash));
  } finally {
    console.info = originalInfo;
  }
});

test("check-in POST requests preserve existing mutation security", async () => {
  const fixture = context();
  const { app } = application(fixture, (_req, res) => {
    res.status(403).json({ success: false });
  });
  await request(app)
    .post("/api/admin/check-in/confirm")
    .set("x-test-role", "ADMIN")
    .send({ method: "QR", credential: fixture.credential.raw })
    .expect(403);
  assert.equal(fixture.confirms.length, 0);
});
