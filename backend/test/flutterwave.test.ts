import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import {
  FlutterwaveProvider,
  flutterwaveMinorUnits,
} from "../src/payments/providers/flutterwave.provider";
import {
  PaymentRequestError,
  PaymentService,
  PaymentProviderUnavailableError,
} from "../src/payments/payment.service";
import { createFlutterwaveWebhookSignatureMiddleware } from "../src/middleware/flutterwaveWebhookSignature.middleware";
import { initializePaymentSchema } from "../src/validators/payment.validator";
import { registrationRetryPaymentSchema } from "../src/validators/delegate.validator";
import { loadEnvironment } from "../src/config/env";

const input = {
  email: "delegate@example.com",
  amountMinor: 150000,
  currency: "USD" as const,
  reference: "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
  callbackUrl: "https://conference.example/registration/payment/callback",
  metadata: {
    registrationReference: "AIAIAC-DEL-ABCDEFGH",
    paymentReference: "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
    packageCode: "PROFESSIONAL",
  },
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
function verified(overrides = {}) {
  return {
    status: "success",
    data: {
      id: 123,
      tx_ref: input.reference,
      status: "successful",
      amount: "1500.00",
      charged_amount: "1500.00",
      currency: "USD",
      customer: { email: "Delegate@Example.com" },
      ...overrides,
    },
  };
}

test("Flutterwave Standard v3 initializes exact major-unit amount without a public key or access code", async () => {
  let calls = 0;
  const gateway = new FlutterwaveProvider(
    "test-backend-secret",
    async (url, init) => {
      calls++;
      assert.equal(url, "https://api.flutterwave.com/v3/payments");
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer test-backend-secret",
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.amount, "1500.00");
      assert.equal(body.tx_ref, input.reference);
      assert.equal(body.currency, "USD");
      assert.equal(body.redirect_url, input.callbackUrl);
      assert.deepEqual(body.customer, { email: input.email });
      return reply({
        status: "success",
        data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/test" },
      });
    },
  );
  const result = await gateway.initialize(input);
  assert.equal(result.accessCode, null);
  assert.equal(result.reference, input.reference);
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(result).includes("secret"));
});
test("Flutterwave verifies merchant reference or webhook transaction id and normalizes only successful", async () => {
  const urls: string[] = [];
  const gateway = new FlutterwaveProvider("test-secret", async (url) => {
    urls.push(String(url));
    return reply(verified());
  });
  const result = await gateway.verify(input.reference);
  assert.equal(result.status, "success");
  assert.equal(result.amountMinor, 150000);
  assert.equal(result.customerEmail, input.email);
  await gateway.verify(input.reference, "123");
  assert.ok(urls[0]?.includes("verify_by_reference?tx_ref="));
  assert.ok(urls[1]?.endsWith("/transactions/123/verify"));
  await assert.rejects(
    gateway.verify(input.reference, "999"),
    PaymentRequestError,
  );
  const failed = new FlutterwaveProvider("test-secret", async () =>
    reply(verified({ status: "failed" })),
  );
  assert.equal((await failed.verify(input.reference)).status, "pending");
});
test("Flutterwave preserves reference, amount and currency for shared finalizer checks", async () => {
  for (const fields of [
    { tx_ref: "wrong" },
    { amount: "1499.99" },
    { currency: "NGN" },
    { customer: { email: "other@example.com" } },
  ]) {
    const result = await new FlutterwaveProvider("test-secret", async () =>
      reply(verified(fields)),
    ).verify(input.reference);
    assert.notDeepEqual(
      [
        result.reference,
        result.requestedAmountMinor ?? result.amountMinor,
        result.currency,
        result.customerEmail,
      ],
      [input.reference, input.amountMinor, input.currency, input.email],
    );
  }
});
test("Flutterwave amount parser rejects rounding, exponent, overflow and invalid amounts", () => {
  assert.equal(flutterwaveMinorUnits("2100000.00"), 210000000);
  assert.equal(flutterwaveMinorUnits(0.29), 29);
  for (const amount of [
    "1.001",
    "1e3",
    "-1",
    "0",
    "NaN",
    "9999999999999999999",
  ])
    assert.throws(() => flutterwaveMinorUnits(amount));
});
test("Flutterwave timeouts, HTTP errors, not-found and malformed checkout remain ambiguous", async () => {
  for (const transport of [
    async () => {
      throw new Error("timeout");
    },
    async () => reply({}, 500),
    async () => reply({ status: "success", data: {} }),
    async () =>
      reply({
        status: "success",
        data: { link: "https://attacker.example/pay" },
      }),
  ]) {
    await assert.rejects(
      new FlutterwaveProvider("test-secret", transport).initialize(input),
      (e: unknown) => e instanceof PaymentRequestError && e.ambiguous,
    );
  }
  await assert.rejects(
    new FlutterwaveProvider("test-secret", async () =>
      reply({ status: "error", message: "Rejected" }),
    ).initialize(input),
    (e: unknown) => e instanceof PaymentRequestError && !e.ambiguous,
  );
  await assert.rejects(
    new FlutterwaveProvider("test-secret", async () =>
      reply({ status: "error", message: "Not found" }),
    ).verify(input.reference),
    PaymentRequestError,
  );
});
test("v3 webhook requires exact secret hash; missing config fails closed", async () => {
  let calls = 0;
  const app = express();
  app.post(
    "/hook",
    createFlutterwaveWebhookSignatureMiddleware(
      "random-test-webhook-secret-hash-123456",
    ),
    (_req, res) => {
      calls++;
      res.sendStatus(200);
    },
  );
  app.post(
    "/disabled",
    createFlutterwaveWebhookSignatureMiddleware(),
    (_req, res) => res.sendStatus(200),
  );
  for (const hash of ["", "bad", "random-test-webhook-secret-hash-123457"])
    await request(app).post("/hook").set("verif-hash", hash).expect(401);
  await request(app)
    .post("/hook")
    .set("verif-hash", "random-test-webhook-secret-hash-123456")
    .expect(200);
  await request(app).post("/disabled").expect(503);
  assert.equal(calls, 1);
});
test("initialization defaults to Paystack; only online allowlist accepted on both routes", () => {
  assert.equal(
    initializePaymentSchema.parse({ currency: "USD" }).provider,
    "PAYSTACK",
  );
  assert.equal(
    initializePaymentSchema.parse({ currency: "NGN", provider: "FLUTTERWAVE" })
      .provider,
    "FLUTTERWAVE",
  );
  for (const provider of ["MANUAL", "unknown"]) {
    assert.equal(
      initializePaymentSchema.safeParse({ currency: "USD", provider }).success,
      false,
    );
    assert.equal(
      registrationRetryPaymentSchema.safeParse({
        continuationToken: "a".repeat(43),
        currency: "USD",
        provider,
      }).success,
      false,
    );
  }
});
test("registry defaults to Paystack and disabled Flutterwave fails before gateway access", async () => {
  const provider = new FlutterwaveProvider("test-secret", async () =>
    reply(verified()),
  );
  const registry = new PaymentService({ PAYSTACK: provider });
  assert.equal((await registry.verify(input.reference)).status, "success");
  assert.throws(
    () => registry.requireProvider("FLUTTERWAVE"),
    PaymentProviderUnavailableError,
  );
});
test("Flutterwave configuration is optional, all-or-nothing and constrained to frontend callback", () => {
  assert.equal(loadEnvironment({ NODE_ENV: "test" }).flutterwave, undefined);
  assert.throws(
    () =>
      loadEnvironment({
        NODE_ENV: "test",
        FLUTTERWAVE_SECRET_KEY: "a".repeat(32),
      }),
    /FLUTTERWAVE/,
  );
  const config = {
    NODE_ENV: "test",
    CLIENT_URL: "http://localhost:5173",
    FLUTTERWAVE_SECRET_KEY: "a".repeat(32),
    FLUTTERWAVE_WEBHOOK_SECRET_HASH: "b".repeat(32),
    FLUTTERWAVE_CALLBACK_URL:
      "http://localhost:5173/registration/payment/callback",
  };
  assert.ok(loadEnvironment(config).flutterwave);
  assert.throws(
    () =>
      loadEnvironment({
        ...config,
        FLUTTERWAVE_CALLBACK_URL:
          "https://attacker.example/registration/payment/callback",
      }),
    /FLUTTERWAVE/,
  );
});

test("Flutterwave sandbox checkout hostname is accepted only with test credentials", async () => {
  const sandboxUrl =
    "https://checkout-v2.dev-flutterwave.com/v3/hosted/pay/synthetic";
  const transport: typeof fetch = async () =>
    reply({ status: "success", data: { link: sandboxUrl } });
  const testGateway = new FlutterwaveProvider(
    "FLWSECK_TEST-synthetic-key",
    transport,
  );
  assert.equal(
    (await testGateway.initialize(input)).authorizationUrl,
    sandboxUrl,
  );
  await assert.rejects(
    new FlutterwaveProvider("FLWSECK-synthetic-live-key", transport).initialize(
      input,
    ),
    PaymentRequestError,
  );
  for (const link of [
    "http://checkout-v2.dev-flutterwave.com/pay",
    "https://checkout-v2.dev-flutterwave.com.attacker.example/pay",
    "https://user:password@checkout-v2.dev-flutterwave.com/pay",
    "https://checkout-v2.dev-flutterwave.com:444/pay",
  ]) {
    await assert.rejects(
      new FlutterwaveProvider("FLWSECK_TEST-synthetic-key", async () =>
        reply({ status: "success", data: { link } }),
      ).initialize(input),
      PaymentRequestError,
    );
  }
});
