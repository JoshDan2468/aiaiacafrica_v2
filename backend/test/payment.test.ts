import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createAdminPaymentController } from "../src/controllers/adminPayment.controller";
import { createPaymentController } from "../src/controllers/payment.controller";
import { createPaystackWebhookSignatureMiddleware } from "../src/middleware/paystackWebhookSignature.middleware";
import { PaymentService } from "../src/payments/payment.service";
import type {
  InitializeProviderPaymentInput,
  InitializedProviderPayment,
  PaymentProvider,
  VerifiedProviderPayment,
} from "../src/payments/payment.types";
import { PaystackProvider } from "../src/payments/providers/paystack.provider";
import type {
  PaymentFinalization,
  PaymentPreparation,
  PaymentRepository,
  SuccessfulPaymentInput,
} from "../src/repositories/payment.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createPaymentRouter } from "../src/routes/payment.routes";
import {
  DelegatePaymentService,
  PaymentAlreadyPaidError,
  PaymentCompletionIneligibleError,
  PaymentInitializationFailedError,
  PaymentInitializationInProgressError,
  PaymentNotFoundError,
  PaymentPriceUnavailableError,
  PaymentRegistrationIneligibleError,
  PaymentVerificationMismatchError,
} from "../src/services/delegatePayment.service";
import type { AdminRole } from "../src/types/admin";
import type {
  PaymentDetail,
  PaymentListFilters,
  PaymentListResult,
  PaymentRecord,
} from "../src/types/payment";

const registrationReference = "AIAIAC-DEL-ABCDEFGH";
const paymentReference = "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN";
const secret = "sk_test_payment_test_secret";

function makePayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "5f1369a7-7d55-41bd-9641-450ac9d62857",
    registrationId: "3b7a5ce4-b0d4-4196-a3ba-116c4b62f141",
    registrationReference,
    delegateName: "Amina Okafor",
    delegateEmail: "amina@example.com",
    provider: "PAYSTACK",
    paymentSource: "PAYSTACK",
    paymentMethod: "PAYSTACK",
    paymentReference,
    providerTransactionId: null,
    packageCode: "PROFESSIONAL",
    packageName: "Professional Delegate",
    currency: "USD",
    amountMinor: 150000,
    status: "INITIALIZED",
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
    externalReference: null,
    payerName: null,
    internalNote: null,
    paymentDate: null,
    recordedByAdminId: null,
    recordedByName: null,
    confirmedByAdminId: null,
    confirmedByName: null,
    confirmedAt: null,
    confirmationEmailStatus: "NOT_QUEUED",
    createdAt: new Date("2026-09-15T00:00:00.000Z"),
    paidAt: null,
    verifiedAt: null,
    ...overrides,
  };
}

class FakePaymentRepository implements PaymentRepository {
  payment: PaymentRecord | null = null;
  preparationKind:
    | "normal"
    | "not_found"
    | "ineligible"
    | "already_paid"
    | "price_unavailable"
    | "initializing" = "normal";
  verificationFailures = 0;
  finalizationCalls = 0;
  reconciliationCandidates: Array<{ paymentReference: string }> = [];

  async prepareInitialization(
    reference: string,
    currency: "USD" | "NGN",
    nextPaymentReference: string,
  ): Promise<PaymentPreparation> {
    if (
      this.preparationKind === "not_found" ||
      reference !== registrationReference
    )
      return { kind: "not_found" };
    if (this.preparationKind === "already_paid")
      return { kind: "already_paid" };
    if (this.preparationKind === "ineligible") return { kind: "ineligible" };
    if (this.preparationKind === "price_unavailable")
      return { kind: "price_unavailable" };
    if (this.preparationKind === "initializing")
      return { kind: "initializing", paymentReference };
    if (this.payment?.status === "PENDING")
      return { kind: "existing", payment: this.payment };
    this.payment = makePayment({
      paymentReference: nextPaymentReference,
      currency,
      amountMinor: currency === "USD" ? 150000 : 210000000,
    });
    return {
      kind: "created",
      payment: this.payment,
      email: this.payment.delegateEmail,
      registrationReference,
      packageCode: "PROFESSIONAL",
    };
  }

  async completeInitialization(
    reference: string,
    authorizationUrl: string,
    accessCode: string,
  ) {
    if (!this.payment || this.payment.paymentReference !== reference)
      return null;
    this.payment = {
      ...this.payment,
      authorizationUrl,
      accessCode,
      status: "PENDING",
    };
    return this.payment;
  }

  async failInitialization() {
    if (this.payment) this.payment = { ...this.payment, status: "FAILED" };
  }

  async findByReference(reference: string) {
    return this.payment?.paymentReference === reference ? this.payment : null;
  }

  async recordVerificationFailure(_reference: string, reason: string) {
    this.verificationFailures += 1;
    if (this.payment?.status !== "PAID")
      this.payment = {
        ...this.payment!,
        status:
          reason === "PROVIDER_ABANDONED"
            ? "ABANDONED"
            : reason === "PROVIDER_REVERSED"
              ? "REVERSED"
              : "FAILED",
      };
  }

  async recordProviderObservation(_reference: string, providerStatus: string) {
    if (this.payment) this.payment = { ...this.payment, providerStatus };
  }

  async recordRefundState(_reference: string, providerStatus: string) {
    if (!this.payment) return null;
    this.payment = {
      ...this.payment,
      providerStatus: providerStatus === "failed" ? "success" : providerStatus,
      status:
        providerStatus === "failed"
          ? "PAID"
          : ["processed", "reversed"].includes(providerStatus)
            ? "REVERSED"
            : "RECONCILIATION_REQUIRED",
      reconciliationReason:
        providerStatus === "failed"
          ? null
          : `REFUND_${providerStatus.toUpperCase()}`,
    };
    return this.payment;
  }

  async claimReconciliationCandidates() {
    const candidates = this.reconciliationCandidates;
    this.reconciliationCandidates = [];
    return candidates;
  }

  async finalizeSuccessfulPayment(
    input: SuccessfulPaymentInput,
  ): Promise<PaymentFinalization> {
    this.finalizationCalls += 1;
    if (!this.payment) return { kind: "not_found" };
    const reason =
      input.providerReference !== this.payment.paymentReference
        ? "reference"
        : input.amountMinor !== this.payment.amountMinor ||
            input.chargedAmountMinor < input.amountMinor
          ? "amount"
          : input.currency !== this.payment.currency
            ? "currency"
            : input.customerEmail !== this.payment.delegateEmail
              ? "customer"
              : null;
    if (reason) {
      this.payment = { ...this.payment, status: "FAILED" };
      return { kind: "mismatch", reason };
    }
    if (this.payment.status === "PAID")
      return { kind: "paid", payment: this.payment, becamePaid: false };
    this.payment = {
      ...this.payment,
      status: "PAID",
      providerStatus: "success",
      financialAuthority: "AUTHORITATIVE",
      authoritativePaymentTransactionId: this.payment.id,
      providerTransactionId: input.providerTransactionId,
      channel: input.channel,
      gatewayResponse: input.gatewayResponse,
      paidAt: input.paidAt ?? new Date(),
      verifiedAt: new Date(),
      confirmationEmailStatus: "PENDING",
    };
    return { kind: "paid", payment: this.payment, becamePaid: true };
  }

  async listPayments(filters: PaymentListFilters): Promise<PaymentListResult> {
    return {
      items: this.payment ? [this.payment] : [],
      total: this.payment ? 1 : 0,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async findPaymentDetail(reference: string): Promise<PaymentDetail | null> {
    const payment = await this.findByReference(reference);
    return payment ? { ...payment, events: [] } : null;
  }
}

class FakeProvider implements PaymentProvider {
  initializationCalls = 0;
  verificationCalls = 0;
  initializationInput: InitializeProviderPaymentInput | null = null;
  failInitialization = false;
  verification: VerifiedProviderPayment = {
    reference: paymentReference,
    status: "success",
    amountMinor: 150000,
    currency: "USD",
    providerTransactionId: "4099260516",
    channel: "card",
    gatewayResponse: "Successful",
    paidAt: new Date("2026-09-15T01:00:00.000Z"),
    customerEmail: "amina@example.com",
  };

  async initialize(
    input: InitializeProviderPaymentInput,
  ): Promise<InitializedProviderPayment> {
    this.initializationCalls += 1;
    this.initializationInput = input;
    if (this.failInitialization)
      throw new PaymentInitializationFailedError();
    return {
      reference: input.reference,
      authorizationUrl: "https://checkout.paystack.com/safe-code",
      accessCode: "safe-code",
    };
  }

  async verify(): Promise<VerifiedProviderPayment> {
    this.verificationCalls += 1;
    return this.verification;
  }
}

class FakeCompletion {
  calls = 0;
  processed: PaymentRecord[] = [];
  fail = false;
  reconciliationAlerts = 0;

  async process(payment: PaymentRecord) {
    this.calls += 1;
    if (this.fail) throw new Error("completion detail");
    if (this.processed.some((item) => item.id === payment.id)) return;
    this.processed.push(payment);
  }

  async notifyReconciliation() {
    this.reconciliationAlerts += 1;
  }
}

function buildService() {
  const repository = new FakePaymentRepository();
  const provider = new FakeProvider();
  const completion = new FakeCompletion();
  const service = new DelegatePaymentService(
    repository,
    new PaymentService(provider),
    completion,
    "http://localhost:5173/registration/payment/callback",
    () => paymentReference,
  );
  return { repository, provider, completion, service };
}

test("Professional USD initialization uses exactly 150000 trusted cents and safe output", async () => {
  const { service, provider } = buildService();
  const result = await service.initialize(registrationReference, "USD");
  assert.equal(provider.initializationInput?.amountMinor, 150000);
  assert.equal(provider.initializationInput?.currency, "USD");
  assert.equal(provider.initializationInput?.reference, paymentReference);
  assert.equal(result.displayAmount, "$1,500.00");
  assert.equal("secretKey" in result, false);
});

test("Professional NGN initialization uses exactly 210000000 trusted kobo", async () => {
  const { service, provider } = buildService();
  const result = await service.initialize(registrationReference, "NGN");
  assert.equal(provider.initializationInput?.amountMinor, 210000000);
  assert.equal(provider.initializationInput?.currency, "NGN");
  assert.equal(result.displayAmount, "₦2,100,000.00");
});

test("Paystack adapter sends the backend secret only as authorization and drops sensitive payloads", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fakeFetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push({ input: String(input), ...(init ? { init } : {}) });
    if (String(input).includes("/verify/")) {
      return new Response(
        JSON.stringify({
          status: true,
          data: {
            id: 4099260516,
            status: "success",
            reference: paymentReference,
            amount: 152000,
            requested_amount: 150000,
            currency: "USD",
            channel: "card",
            gateway_response: "Successful",
            paid_at: "2026-09-15T01:00:00.000Z",
            customer: { email: "amina@example.com" },
            authorization: { authorization_code: "AUTH_must_not_escape" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        status: true,
        data: {
          authorization_url: "https://checkout.paystack.com/safe-code",
          access_code: "safe-code",
          reference: paymentReference,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  const provider = new PaystackProvider(secret, fakeFetch);
  const initialized = await provider.initialize({
    email: "amina@example.com",
    amountMinor: 150000,
    currency: "USD",
    reference: paymentReference,
    callbackUrl: "http://localhost:5173/registration/payment/callback",
    metadata: {
      registrationReference,
      paymentReference,
      packageCode: "PROFESSIONAL",
    },
  });
  const verified = await provider.verify(paymentReference);
  expectSecretOnlyInAuthorization(calls[0]!, secret);
  assert.equal(JSON.stringify(initialized).includes(secret), false);
  assert.equal(
    JSON.stringify(verified).includes("AUTH_must_not_escape"),
    false,
  );
  assert.equal(verified.amountMinor, 152000);
  assert.equal(verified.requestedAmountMinor, 150000);
});

function expectSecretOnlyInAuthorization(
  call: { input: string; init?: RequestInit },
  value: string,
) {
  assert.equal(
    new Headers(call.init?.headers).get("Authorization"),
    `Bearer ${value}`,
  );
  assert.equal(String(call.init?.body).includes(value), false);
  assert.equal(call.input.includes(value), false);
}

test("unsupported currency and body-supplied amounts are rejected", async () => {
  const { service } = buildService();
  const controller = createPaymentController(service);
  const router = Router();
  router.use(
    createPaymentRouter({
      controller,
      rateLimiter: (_request, _response, next) => next(),
      webhookSignature: (_request, _response, next) => next(),
    }),
  );
  const app = createApplication({ apiRouter: router });
  await request(app)
    .post(
      `/api/delegate-registrations/${registrationReference}/payment/initialize`,
    )
    .send({ currency: "EUR" })
    .expect(400);
  await request(app)
    .post(
      `/api/delegate-registrations/${registrationReference}/payment/initialize`,
    )
    .send({ currency: "USD", amount: 1 })
    .expect(400);
});

test("unknown and already-paid registrations are rejected safely", async () => {
  const first = buildService();
  first.repository.preparationKind = "not_found";
  await assert.rejects(
    first.service.initialize(registrationReference, "USD"),
    PaymentNotFoundError,
  );
  const second = buildService();
  second.repository.preparationKind = "already_paid";
  await assert.rejects(
    second.service.initialize(registrationReference, "USD"),
    PaymentAlreadyPaidError,
  );
});

test("Student payment attempts cannot reach Paystack before approval or without an active price", async () => {
  const unapproved = buildService();
  unapproved.repository.preparationKind = "ineligible";
  await assert.rejects(
    unapproved.service.initialize(registrationReference, "USD"),
    PaymentRegistrationIneligibleError,
  );
  assert.equal(unapproved.provider.initializationCalls, 0);

  const unpriced = buildService();
  unpriced.repository.preparationKind = "price_unavailable";
  await assert.rejects(
    unpriced.service.initialize(registrationReference, "USD"),
    PaymentPriceUnavailableError,
  );
  assert.equal(unpriced.provider.initializationCalls, 0);
});

test("provider failure leaves a failed attempt and a later active attempt is reused", async () => {
  const failed = buildService();
  failed.provider.failInitialization = true;
  await assert.rejects(
    failed.service.initialize(registrationReference, "USD"),
    PaymentInitializationFailedError,
  );
  assert.equal(failed.repository.payment?.status, "FAILED");

  const duplicate = buildService();
  const first = await duplicate.service.initialize(
    registrationReference,
    "USD",
  );
  const second = await duplicate.service.initialize(
    registrationReference,
    "USD",
  );
  assert.equal(first.paymentReference, second.paymentReference);
  assert.equal(duplicate.provider.initializationCalls, 1);
});

test("checkout initialization failure sends a secure payment recovery link once after persistence", async () => {
  const repository = new FakePaymentRepository();
  const provider = new FakeProvider();
  provider.failInitialization = true;
  const notified: string[] = [];
  const service = new DelegatePaymentService(
    repository,
    new PaymentService(provider),
    new FakeCompletion(),
    "http://localhost:5173/registration/payment/callback",
    () => paymentReference,
    {
      async sendPaymentRecovery(reference) {
        assert.equal(repository.payment?.status, "FAILED");
        notified.push(reference);
      },
    },
  );

  await assert.rejects(() => service.initialize(registrationReference, "USD"), PaymentInitializationFailedError);
  assert.deepEqual(notified, [paymentReference]);
});

test("recovery email failure cannot replace the original checkout failure", async () => {
  const repository = new FakePaymentRepository();
  const provider = new FakeProvider();
  provider.failInitialization = true;
  const service = new DelegatePaymentService(
    repository,
    new PaymentService(provider),
    new FakeCompletion(),
    "http://localhost:5173/registration/payment/callback",
    () => paymentReference,
    {
      async sendPaymentRecovery() {
        throw new Error("private email delivery detail");
      },
    },
  );

  await assert.rejects(() => service.initialize(registrationReference, "USD"), PaymentInitializationFailedError);
  assert.equal(repository.payment?.status, "FAILED");
});

test("an in-flight concurrent initialization is rejected without another provider call", async () => {
  const context = buildService();
  context.repository.preparationKind = "initializing";
  await assert.rejects(
    context.service.initialize(registrationReference, "USD"),
    PaymentInitializationInProgressError,
  );
  assert.equal(context.provider.initializationCalls, 0);
});

test("correct verification pays once and invokes idempotent completion", async () => {
  const context = buildService();
  await context.service.initialize(registrationReference, "USD");
  const first = await context.service.verify(paymentReference);
  const second = await context.service.verify(paymentReference);
  assert.equal(first.status, "PAID");
  assert.equal(second.status, "PAID");
  assert.equal(context.repository.finalizationCalls, 1);
  assert.equal(context.completion.calls, 2);
  assert.equal(context.completion.processed.length, 1);
});

test("customer-borne Paystack fees validate the trusted requested amount", async () => {
  const context = buildService();
  await context.service.initialize(registrationReference, "USD");
  context.provider.verification = {
    ...context.provider.verification,
    amountMinor: 152000,
    requestedAmountMinor: 150000,
  };
  const payment = await context.service.verify(paymentReference);
  assert.equal(payment.status, "PAID");
  assert.equal(context.repository.payment?.status, "PAID");
});

test("trusted requested amount cannot conceal a provider underpayment", async () => {
  const context = buildService();
  await context.service.initialize(registrationReference, "USD");
  context.provider.verification = {
    ...context.provider.verification,
    amountMinor: 149999,
    requestedAmountMinor: 150000,
  };
  await assert.rejects(
    context.service.verify(paymentReference),
    PaymentVerificationMismatchError,
  );
  assert.notEqual(context.repository.payment?.status, "PAID");
});

test("amount, currency, reference, and customer mismatches never become paid", async (t) => {
  const cases: Array<[string, Partial<VerifiedProviderPayment>]> = [
    ["amount", { amountMinor: 99999 }],
    ["currency", { currency: "NGN" }],
    ["reference", { reference: "AIAIAC-PAY-ZZZZZZZZZZZZZZZZZZZZZZZZ" }],
    ["customer", { customerEmail: "other@example.com" }],
  ];
  for (const [name, override] of cases) {
    await t.test(name, async () => {
      const context = buildService();
      await context.service.initialize(registrationReference, "USD");
      context.provider.verification = {
        ...context.provider.verification,
        ...override,
      };
      await assert.rejects(
        context.service.verify(paymentReference),
        PaymentVerificationMismatchError,
      );
      assert.equal(context.repository.payment?.status, "FAILED");
      assert.equal(context.completion.calls, 0);
    });
  }
});

for (const [providerStatus, expectedStatus] of [
  ["failed", "FAILED"],
  ["abandoned", "ABANDONED"],
  ["reversed", "REVERSED"],
] as const) {
  test(`${providerStatus} provider status stays unpaid`, async () => {
    const context = buildService();
    await context.service.initialize(registrationReference, "USD");
    context.provider.verification = {
      ...context.provider.verification,
      status: providerStatus,
    };
    const result = await context.service.verify(paymentReference);
    assert.equal(result.status, expectedStatus);
    assert.equal(context.completion.calls, 0);
  });
}

test("bounded reconciliation settles an eligible attempt once", async () => {
  const context = buildService();
  context.repository.payment = makePayment({ status: "PENDING" });
  context.repository.reconciliationCandidates = [{ paymentReference }];
  const first = await context.service.reconcile(25);
  const second = await context.service.reconcile(25);
  assert.deepEqual(first, {
    examined: 1,
    authoritative: 1,
    duplicateSuccess: 0,
    unresolved: 0,
    providerErrors: 0,
  });
  assert.equal(second.examined, 0);
  assert.equal(context.repository.payment.status, "PAID");
});

test("reconciliation detects abandoned checkout and requests secure recovery", async () => {
  const context = buildService();
  context.repository.payment = makePayment({ status: "PENDING" });
  context.repository.reconciliationCandidates = [{ paymentReference }];
  context.provider.verification = {
    ...context.provider.verification,
    status: "abandoned",
  };
  const recovered: string[] = [];
  const service = new DelegatePaymentService(
    context.repository,
    new PaymentService(context.provider),
    context.completion,
    "http://localhost:5173/registration/payment/callback",
    () => paymentReference,
    {
      async sendPaymentRecovery(reference) {
        recovered.push(reference);
      },
    },
  );

  const summary = await service.reconcile(25);

  assert.equal(summary.examined, 1);
  assert.equal(summary.unresolved, 1);
  assert.equal(context.repository.payment.status, "ABANDONED");
  assert.deepEqual(recovered, [paymentReference]);
  assert.equal(context.completion.calls, 0);
});

for (const providerStatus of ["pending", "ongoing"] as const) {
  test(`reconciliation does not treat ${providerStatus} checkout as abandoned`, async () => {
    const context = buildService();
    context.repository.payment = makePayment({ status: "PENDING" });
    context.repository.reconciliationCandidates = [{ paymentReference }];
    context.provider.verification = {
      ...context.provider.verification,
      status: providerStatus,
    };
    const recovered: string[] = [];
    const service = new DelegatePaymentService(
      context.repository,
      new PaymentService(context.provider),
      context.completion,
      "http://localhost:5173/registration/payment/callback",
      () => paymentReference,
      {
        async sendPaymentRecovery(reference) {
          recovered.push(reference);
        },
      },
    );

    const summary = await service.reconcile(25);

    assert.equal(summary.unresolved, 1);
    assert.equal(context.repository.payment.status, "PENDING");
    assert.deepEqual(recovered, []);
  });
}

test("bounded reconciliation records provider unavailability without changing payment", async () => {
  const context = buildService();
  context.repository.payment = makePayment({ status: "PENDING" });
  context.repository.reconciliationCandidates = [{ paymentReference }];
  const service = new DelegatePaymentService(
    context.repository,
    new PaymentService(null),
    context.completion,
    "http://localhost/callback",
  );
  const result = await service.reconcile(1);
  assert.equal(result.providerErrors, 1);
  assert.equal(context.repository.payment.status, "PENDING");
});

test("refund lifecycle surfaces action without attendee completion or automatic pass policy", async () => {
  const context = buildService();
  context.repository.payment = makePayment({
    status: "PAID",
    providerStatus: "success",
    financialAuthority: "AUTHORITATIVE",
    authoritativePaymentTransactionId: makePayment().id,
  });
  const pending = await context.service.processPaystackWebhook({
    event: "refund.pending",
    data: { status: "pending", transaction_reference: paymentReference },
  });
  assert.equal(pending.status, "RECONCILIATION_REQUIRED");
  assert.equal(context.completion.calls, 0);
  assert.equal(context.completion.reconciliationAlerts, 1);

  const failed = await context.service.processPaystackWebhook({
    event: "refund.failed",
    data: { status: "failed", transaction_reference: paymentReference },
  });
  assert.equal(failed.status, "PAID");

  const processed = await context.service.processPaystackWebhook({
    event: "refund.processed",
    data: { status: "processed", transaction_reference: paymentReference },
  });
  assert.equal(processed.status, "REVERSED");
  assert.equal(context.completion.calls, 0);
});

test("completion failure never reverses a paid transaction", async () => {
  const context = buildService();
  context.completion.fail = true;
  await context.service.initialize(registrationReference, "USD");
  const result = await context.service.verify(paymentReference);
  assert.equal(result.status, "PAID");
  assert.equal(context.repository.payment?.status, "PAID");
  assert.equal(context.completion.calls, 1);
});

function webhookApp(context = buildService()) {
  context.repository.payment = makePayment({
    status: "PENDING",
    authorizationUrl: "https://checkout.paystack.com/safe-code",
    accessCode: "safe-code",
  });
  const apiRouter = Router();
  apiRouter.use(
    createPaymentRouter({
      controller: createPaymentController(context.service),
      rateLimiter: (_request, _response, next) => next(),
      webhookSignature: createPaystackWebhookSignatureMiddleware(secret),
    }),
  );
  return { app: createApplication({ apiRouter }), context };
}

function chargeSuccess(overrides: Record<string, unknown> = {}) {
  return {
    event: "charge.success",
    data: {
      id: 4099260516,
      status: "success",
      reference: paymentReference,
      amount: 150000,
      currency: "USD",
      channel: "card",
      gateway_response: "Successful",
      paid_at: "2026-09-15T01:00:00.000Z",
      customer: { email: "amina@example.com" },
      ...overrides,
    },
  };
}

test("webhook requires a valid raw-body signature and repeated delivery is idempotent", async () => {
  const { app, context } = webhookApp();
  const body = JSON.stringify(chargeSuccess());
  const signature = createHmac("sha512", secret).update(body).digest("hex");
  await request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .send(body)
    .expect(401);
  await request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .set("x-paystack-signature", "0".repeat(128))
    .send(body)
    .expect(401);
  await request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .set("x-paystack-signature", signature)
    .send(body)
    .expect(200);
  await request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .set("x-paystack-signature", signature)
    .send(body)
    .expect(200);
  assert.equal(context.repository.payment?.status, "PAID");
  assert.equal(context.completion.processed.length, 1);
});

test("signed webhook accepts a fee-inclusive charge only for its trusted requested amount", async () => {
  const { app, context } = webhookApp();
  const body = JSON.stringify(
    chargeSuccess({ amount: 152000, requested_amount: 150000 }),
  );
  const signature = createHmac("sha512", secret).update(body).digest("hex");
  await request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .set("x-paystack-signature", signature)
    .send(body)
    .expect(200);
  assert.equal(context.repository.payment?.status, "PAID");
});

test("signed refund webhooks preserve provider reversal state for Finance review", async () => {
  const { app, context } = webhookApp();
  context.repository.payment = makePayment({
    status: "PAID",
    providerStatus: "success",
    financialAuthority: "AUTHORITATIVE",
    authoritativePaymentTransactionId: makePayment().id,
  });
  const refund = JSON.stringify({
    event: "refund.pending",
    data: {
      status: "pending",
      transaction_reference: paymentReference,
      refund_reference: "REFUND-1",
      amount: "150000",
      currency: "USD",
    },
  });
  const signature = createHmac("sha512", secret).update(refund).digest("hex");
  const response = await request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .set("x-paystack-signature", signature)
    .send(refund)
    .expect(200);
  assert.equal(response.body.data.status, "RECONCILIATION_REQUIRED");
  assert.equal(context.completion.calls, 0);
  assert.equal(context.completion.reconciliationAlerts, 1);
});

test("browser callback after a paid webhook returns PAID without another provider verification", async () => {
  const { app, context } = webhookApp();
  const body = JSON.stringify(chargeSuccess());
  const signature = createHmac("sha512", secret).update(body).digest("hex");
  await request(app)
    .post("/api/payments/paystack/webhook")
    .set("Content-Type", "application/json")
    .set("x-paystack-signature", signature)
    .send(body)
    .expect(200);

  const callback = await request(app)
    .get(`/api/payments/${paymentReference}/verify`)
    .expect(200);
  assert.equal(callback.body.data.payment.status, "PAID");
  assert.equal(
    callback.body.data.payment.registrationReference,
    registrationReference,
  );
  assert.equal(context.provider.verificationCalls, 0);
  assert.equal(context.repository.finalizationCalls, 1);
  assert.equal(context.completion.processed.length, 1);
});

test("callback recognizes a webhook that commits while provider verification is in flight", async () => {
  const context = buildService();
  context.repository.payment = makePayment({ status: "PENDING" });
  context.provider.verify = async () => {
    context.provider.verificationCalls += 1;
    await context.service.processPaystackWebhook(chargeSuccess());
    throw new Error("provider became unavailable after webhook confirmation");
  };

  const callback = await context.service.verify(paymentReference);
  assert.equal(callback.status, "PAID");
  assert.equal(context.repository.payment?.status, "PAID");
  assert.equal(context.repository.finalizationCalls, 1);
  assert.equal(context.completion.processed.length, 1);
});

test("signed webhook mismatches and unknown references are acknowledged without payment", async () => {
  for (const bodyObject of [
    chargeSuccess({ amount: 1 }),
    chargeSuccess({ currency: "NGN" }),
    chargeSuccess({ reference: "AIAIAC-PAY-AAAAAAAAAAAAAAAAAAAAAAAA" }),
  ]) {
    const { app, context } = webhookApp();
    const body = JSON.stringify(bodyObject);
    const signature = createHmac("sha512", secret).update(body).digest("hex");
    const response = await request(app)
      .post("/api/payments/paystack/webhook")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", signature)
      .send(body)
      .expect(200);
    assert.equal(response.body.data.processed, false);
    assert.notEqual(context.repository.payment?.status, "PAID");
  }
});

test("Admin payment API permits Finance and Super Admin, but denies other roles and anonymous users", async () => {
  const context = buildService();
  context.repository.payment = makePayment({ status: "PAID" });
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "admin",
      fullName: "Test",
      email: "test@example.com",
      role,
    };
    next();
  };
  const apiRouter = Router();
  apiRouter.use(
    "/admin",
    createAdminRouter({
      requireAuth,
      adminPaymentController: createAdminPaymentController(context.service),
    }),
  );
  const app = createApplication({ apiRouter });
  await request(app).get("/api/admin/payments").expect(401);
  await request(app)
    .get("/api/admin/payments")
    .set("x-test-role", "COMMUNICATIONS")
    .expect(403);
  const financeResponse = await request(app)
    .get("/api/admin/payments")
    .set("x-test-role", "FINANCE")
    .expect(200);
  const financePayment = financeResponse.body.data.payments.items[0];
  assert.equal(
    financePayment.paymentReference,
    context.repository.payment.paymentReference,
  );
  assert.equal("authorizationUrl" in financePayment, false);
  assert.equal("accessCode" in financePayment, false);
  await request(app)
    .get("/api/admin/payments")
    .set("x-test-role", "SUPER_ADMIN")
    .expect(200);
  await request(app)
    .get("/api/admin/payments/' OR 1=1 --")
    .set("x-test-role", "FINANCE")
    .expect(400);
  await request(app)
    .post("/api/admin/payments/reconcile")
    .set("x-test-role", "COMMUNICATIONS")
    .send({ limit: 1 })
    .expect(403);
  const reconciliation = await request(app)
    .post("/api/admin/payments/reconcile")
    .set("x-test-role", "FINANCE")
    .send({ limit: 1 })
    .expect(200);
  assert.equal(reconciliation.body.data.summary.examined, 0);
});

test("authorized Finance can retry completion for an existing PAID payment", async () => {
  const context = buildService();
  context.repository.payment = makePayment({ status: "PAID" });
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "admin",
      fullName: "Test",
      email: "test@example.com",
      role,
    };
    next();
  };
  const apiRouter = Router();
  apiRouter.use(
    "/admin",
    createAdminRouter({
      requireAuth,
      adminPaymentController: createAdminPaymentController(context.service),
    }),
  );
  const app = createApplication({ apiRouter });
  const endpoint = `/api/admin/payments/${paymentReference}/completion/retry`;
  await request(app)
    .post(endpoint)
    .set("x-test-role", "COMMUNICATIONS")
    .expect(403);
  await request(app).post(endpoint).set("x-test-role", "FINANCE").expect(200);
  assert.equal(context.completion.processed.length, 1);
});

test("completion retry rejects a payment that is not PAID", async () => {
  const context = buildService();
  context.repository.payment = makePayment({ status: "PENDING" });
  await assert.rejects(
    context.service.retryCompletion(paymentReference),
    PaymentCompletionIneligibleError,
  );
  assert.equal(context.completion.calls, 0);
});
