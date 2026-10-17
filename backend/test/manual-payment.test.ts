import assert from "node:assert/strict";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createAdminPaymentController } from "../src/controllers/adminPayment.controller";
import { createPaymentController } from "../src/controllers/payment.controller";
import type {
  ManualPaymentEligibility,
  ManualPaymentRepository,
  ManualPaymentConfirmationResult,
  ManualPaymentRecordResult,
  RecordManualPaymentInput,
} from "../src/repositories/manualPayment.repository";
import type { PaymentRepository } from "../src/repositories/payment.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createPaymentRouter } from "../src/routes/payment.routes";
import type { DelegatePaymentService } from "../src/services/delegatePayment.service";
import {
  ManualPaymentAmountMismatchError,
  ManualPaymentService,
} from "../src/services/manualPayment.service";
import type { AdminRole } from "../src/types/admin";
import type { PaymentRecord } from "../src/types/payment";

const registrationReference = "AIAIAC-DEL-ABCDEFGH";
const paymentReference = "AIAIAC-MAN-1234567890ABCDEFGHIJKLMN";

function manualPayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "5f1369a7-7d55-41bd-9641-450ac9d62857",
    registrationId: "3b7a5ce4-b0d4-4196-a3ba-116c4b62f141",
    registrationReference,
    delegateName: "Amina Okafor",
    delegateEmail: "amina@example.com",
    provider: "MANUAL",
    paymentSource: "MANUAL",
    paymentMethod: "BANK_TRANSFER",
    paymentReference,
    providerTransactionId: null,
    packageCode: "PROFESSIONAL",
    packageName: "Professional Delegate",
    currency: "NGN",
    amountMinor: 210000000,
    status: "PENDING_CONFIRMATION",
    providerStatus: null,
    financialAuthority: "UNRESOLVED",
    reconciliationReason: null,
    reconciliationAttempts: 0,
    reconciliationLastAttemptAt: null,
    failureReason: null,
    authoritativePaymentTransactionId: null,
    authorizationUrl: null,
    accessCode: null,
    channel: null,
    gatewayResponse: null,
    externalReference: "BANK-REF-100",
    payerName: "Example Energy",
    internalNote: "Finance evidence checked",
    paymentDate: new Date("2026-09-28T09:00:00.000Z"),
    recordedByAdminId: "admin-1",
    recordedByName: "Finance One",
    confirmedByAdminId: null,
    confirmedByName: null,
    confirmedAt: null,
    confirmationEmailStatus: "NOT_QUEUED",
    createdAt: new Date("2026-09-28T10:00:00.000Z"),
    paidAt: null,
    verifiedAt: null,
    ...overrides,
  };
}

class FakeManualRepository implements ManualPaymentRepository {
  eligibility: ManualPaymentEligibility = {
    registrationReference,
    delegateName: "Amina Okafor",
    delegateEmail: "amina@example.com",
    packageCode: "PROFESSIONAL",
    packageName: "Professional Delegate",
    currency: "NGN",
    amountMinor: 210000000,
    eligible: true,
    reason: null,
  };
  recordResult: ManualPaymentRecordResult = {
    kind: "recorded",
    paymentReference,
  };
  confirmationResults: ManualPaymentConfirmationResult[] = [
    { kind: "confirmed", paymentReference },
    { kind: "already_confirmed", paymentReference },
  ];
  records: RecordManualPaymentInput[] = [];

  async inspectEligibility() {
    return this.eligibility;
  }

  async record(input: RecordManualPaymentInput) {
    this.records.push(input);
    return this.recordResult;
  }

  async confirm() {
    return (
      this.confirmationResults.shift() ?? {
        kind: "already_confirmed" as const,
        paymentReference,
      }
    );
  }
}

function buildManualService(repository = new FakeManualRepository()) {
  let payment = manualPayment();
  const completions: PaymentRecord[] = [];
  const payments = {
    async findByReference() {
      const result =
        repository.confirmationResults.length < 2
          ? manualPayment({
              status: "PAID",
              financialAuthority: "AUTHORITATIVE",
              authoritativePaymentTransactionId: payment.id,
              confirmedByAdminId: "admin-2",
              confirmedByName: "Finance Two",
              confirmedAt: new Date(),
              paidAt: payment.paymentDate,
            })
          : payment;
      payment = result;
      return result;
    },
  } satisfies Pick<PaymentRepository, "findByReference">;
  const service = new ManualPaymentService(
    repository,
    payments,
    {
      async process(item) {
        completions.push(item);
      },
    },
    () => paymentReference,
    () => new Date("2026-09-28T12:00:00.000Z"),
  );
  return { service, repository, completions };
}

test("manual record accepts only the trusted price and remains pending", async () => {
  const context = buildManualService();
  const result = await context.service.record({
    registrationReference,
    method: "BANK_TRANSFER",
    currency: "NGN",
    amountMinor: 210000000,
    externalReference: "BANK-REF-100",
    paymentDate: new Date("2026-09-28T09:00:00.000Z"),
    adminId: "admin-1",
  });
  assert.equal(result.status, "PENDING_CONFIRMATION");
  assert.equal(result.financialAuthority, "UNRESOLVED");
  assert.equal(context.repository.records[0]?.amountMinor, 210000000);

  context.repository.recordResult = {
    kind: "amount_mismatch",
    expectedAmountMinor: 210000000,
  };
  await assert.rejects(
    () =>
      context.service.record({
        registrationReference,
        method: "OFFLINE",
        currency: "NGN",
        amountMinor: 1,
        externalReference: "OFFLINE-REF-2",
        paymentDate: new Date("2026-09-28T09:00:00.000Z"),
        adminId: "admin-1",
      }),
    ManualPaymentAmountMismatchError,
  );
});

test("manual confirmation runs completion once and retry is idempotent", async () => {
  const context = buildManualService();
  const first = await context.service.confirm(paymentReference, "admin-2");
  const second = await context.service.confirm(paymentReference, "admin-1");
  assert.equal(first.alreadyConfirmed, false);
  assert.equal(first.payment.status, "PAID");
  assert.equal(second.alreadyConfirmed, true);
  assert.equal(context.completions.length, 1);
});

test("manual payment routes deny unauthorized roles and permit Finance", async () => {
  const context = buildManualService();
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "admin-1",
      fullName: "Test Finance",
      email: "finance@example.com",
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
      adminPaymentController: createAdminPaymentController(
        {} as DelegatePaymentService,
        context.service,
      ),
    }),
  );
  const app = createApplication({ apiRouter: api });
  const body = {
    registrationReference,
    method: "BANK_TRANSFER",
    currency: "NGN",
    amountMinor: 210000000,
    externalReference: "BANK-REF-100",
    paymentDate: "2026-09-28T09:00:00.000Z",
  };

  await request(app).post("/api/admin/payments/manual").send(body).expect(401);
  await request(app)
    .post("/api/admin/payments/manual")
    .set("x-test-role", "ADMIN")
    .send(body)
    .expect(403);
  await request(app)
    .post("/api/admin/payments/manual")
    .set("x-test-role", "FINANCE")
    .send(body)
    .expect(201);
  await request(app)
    .post(`/api/admin/payments/manual/${paymentReference}/confirm`)
    .set("x-test-role", "COMMUNICATIONS")
    .expect(403);
  await request(app)
    .post(`/api/admin/payments/manual/${paymentReference}/confirm`)
    .set("x-test-role", "FINANCE")
    .expect(200);
});

test("public Paystack verification rejects manual payment references", async () => {
  let verificationCalls = 0;
  const service = {
    async verify() {
      verificationCalls += 1;
      return {};
    },
  } as unknown as DelegatePaymentService;
  const api = createPaymentRouter({
    controller: createPaymentController(service),
    rateLimiter: (_request, _response, next) => next(),
    webhookSignature: (_request, _response, next) => next(),
  });
  const app = createApplication({ apiRouter: api });
  await request(app)
    .get(`/api/payments/${paymentReference}/verify`)
    .expect(400);
  assert.equal(verificationCalls, 0);
});
