/** Fresh loopback-only PostgreSQL acceptance; gateway HTTP is always injected and mocked. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";

import express from "express";
import request from "supertest";

async function main() {
  const { runner } = await import("node-pg-migrate");
  const connection = "postgres://flutterwave_test@127.0.0.1:55439/postgres";
  const setup = new Pool({ connectionString: connection });
  const directory = String(
    (await setup.query("SHOW data_directory")).rows[0].data_directory,
  )
    .replaceAll("\\", "/")
    .toLowerCase();
  assert.equal(
    directory,
    resolve(__dirname, "../../.private/flutterwave-stage1/cluster")
      .replaceAll("\\", "/")
      .toLowerCase(),
  );
  const schema = `flutterwave_${randomUUID().replaceAll("-", "")}`;
  const client = await setup.connect();
  try {
    await runner({
      dbClient: client,
      dir: resolve(__dirname, "../migrations"),
      schema,
      createSchema: true,
      migrationsTable: "pgmigrations",
      direction: "up",
      log: () => {},
    });
  } finally {
    client.release();
  }
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    connection + `?options=${encodeURIComponent(`-c search_path=${schema}`)}`;
  process.env.DATABASE_SSL_MODE = "disable";
  process.env.PAYSTACK_SECRET_KEY = "";
  process.env.FLUTTERWAVE_SECRET_KEY = "";
  process.env.FLUTTERWAVE_CALLBACK_URL = "";
  process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = "";
  const { getDatabasePool, closeDatabasePool } =
    await import("../src/config/database.js");
  const { postgresDelegateRepository } =
    await import("../src/repositories/delegate.repository.js");
  const { DelegateService } =
    await import("../src/services/delegate.service.js");
  const { postgresPaymentRepository: repository } =
    await import("../src/repositories/payment.repository.js");
  const { PaymentService, PaymentRequestError } =
    await import("../src/payments/payment.service.js");
  const { PaystackProvider } =
    await import("../src/payments/providers/paystack.provider.js");
  const { FlutterwaveProvider } =
    await import("../src/payments/providers/flutterwave.provider.js");
  const {
    DelegatePaymentService,
    PaymentRetryUnavailableError,
    PaymentInitializationInProgressError,
    PaymentVerificationMismatchError,
    PaymentRegistrationIneligibleError,
  } = await import("../src/services/delegatePayment.service.js");
  const { createPaymentController } =
    await import("../src/controllers/payment.controller.js");
  const { createPaymentRouter } =
    await import("../src/routes/payment.routes.js");
  const { createPaystackWebhookSignatureMiddleware } =
    await import("../src/middleware/paystackWebhookSignature.middleware.js");
  const { createFlutterwaveWebhookSignatureMiddleware } =
    await import("../src/middleware/flutterwaveWebhookSignature.middleware.js");
  const { errorHandler } =
    await import("../src/middleware/error.middleware.js");
  const { ManualPaymentService } =
    await import("../src/services/manualPayment.service.js");
  const { postgresManualPaymentRepository } =
    await import("../src/repositories/manualPayment.repository.js");
  const pool = getDatabasePool()!;
  const requests: { url: string; body?: Record<string, unknown> }[] = [];
  const attempts = new Map<string, Record<string, unknown>>();
  const txIds = new Map<string, string>();
  let mode:
    "pending" | "success" | "timeout" | "reject" | "notfound" | "failed" =
    "pending";
  let mismatch: Record<string, unknown> = {};
  const mock: typeof fetch = async (url, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ url: String(url), body });
    const json = (v: unknown) => new Response(JSON.stringify(v));
    if (init?.method === "POST") {
      if (mode === "timeout") throw new Error("synthetic timeout");
      if (mode === "reject")
        return json({ status: "error", message: "Rejected" });
      const ref = String(body.tx_ref ?? body.reference);
      attempts.set(ref, body);
      txIds.set(String(attempts.size), ref);
      return body.tx_ref
        ? json({
            status: "success",
            data: {
              link: `https://checkout.flutterwave.com/v3/hosted/pay/${ref}`,
            },
          })
        : json({
            status: true,
            data: {
              reference: ref,
              authorization_url: `https://checkout.paystack.com/${ref}`,
              access_code: ref,
            },
          });
    }
    if (mode === "notfound")
      return json({ status: "error", message: "No transaction" });
    const uri = new URL(String(url));
    const ref =
      uri.searchParams.get("tx_ref") ??
      (uri.host === "api.paystack.co"
        ? decodeURIComponent(uri.pathname.split("/").at(-1)!)
        : txIds.get(uri.pathname.split("/").at(-2)!)!);
    const original = attempts.get(ref);
    assert.ok(original, `expected mock attempt ${ref}`);
    const flw = uri.host === "api.flutterwave.com";
    const id = [...txIds].find(([, r]) => r === ref)![0];
    return json(
      flw
        ? {
            status: "success",
            data: {
              id: Number(id),
              tx_ref: ref,
              status:
                mode === "success"
                  ? "successful"
                  : mode === "failed"
                    ? "failed"
                    : "pending",
              amount: original.amount,
              charged_amount: original.amount,
              currency: original.currency,
              customer: original.customer,
              ...mismatch,
            },
          }
        : {
            status: true,
            data: {
              id: Number(id),
              reference: ref,
              status: mode === "success" ? "success" : "failed",
              amount: Number(original.amount),
              currency: original.currency,
              customer: { email: original.email },
              ...mismatch,
            },
          },
    );
  };
  let completionCalls = 0;
  const completed = new Set<string>();
  const completion = {
    async process(payment: { id: string }) {
      if (!completed.has(payment.id)) {
        completed.add(payment.id);
        completionCalls++;
      }
    },
  };
  const service = new DelegatePaymentService(
    repository,
    new PaymentService({
      PAYSTACK: new PaystackProvider("mock-paystack-secret", mock),
      FLUTTERWAVE: new FlutterwaveProvider("mock-flutterwave-secret", mock),
    }),
    completion,
    "http://localhost:5173/registration/payment/callback",
  );
  const controller = createPaymentController(service);
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createPaymentRouter({
      controller,
      rateLimiter: (_r, _s, next) => next(),
      webhookSignature: createPaystackWebhookSignatureMiddleware(
        "mock-paystack-secret",
      ),
      flutterwaveWebhookSignature: createFlutterwaveWebhookSignatureMiddleware(
        "mock-webhook-hash-12345678901234567890",
      ),
    }),
  );
  app.use(errorHandler);
  const delegates = new DelegateService(postgresDelegateRepository);
  const packageId = (
    await pool.query(
      "SELECT id FROM delegate_packages WHERE delegate_type='PROFESSIONAL'",
    )
  ).rows[0].id;
  async function registration(verified = true) {
    const row = await delegates.createRegistration({
      packageId,
      firstName: "Mock",
      lastName: "Delegate",
      email: `flw-${randomUUID()}@example.com`,
      mobile: "+2348000000000",
      jobTitle: "Engineer",
      companyName: "Test",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Verify gateway integration",
      heardAboutSource: "Test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    if (verified)
      await pool.query(
        "UPDATE delegate_registrations SET email_verification_status='VERIFIED',email_verified_at=now() WHERE id=$1",
        [row.id],
      );
    return row;
  }
  const scenarios: string[] = [];
  async function scenario(name: string, run: () => Promise<void>) {
    await run();
    scenarios.push(name);
    console.log(`PASS ${name}`);
  }
  try {
    await scenario(
      "all migrations apply; Paystack default and NGN pricing remain compatible",
      async () => {
        const r = await registration();
        mode = "pending";
        const res = await request(app)
          .post(`/api/delegate-registrations/${r.reference}/payment/initialize`)
          .send({ currency: "NGN" })
          .expect(200);
        assert.equal(res.body.data.payment.provider, "PAYSTACK");
        assert.equal(res.body.data.payment.amountMinor, 210000000);
        mode = "success";
        assert.equal(
          (await service.verify(res.body.data.payment.paymentReference)).status,
          "PAID",
        );
      },
    );
    await scenario(
      "Flutterwave hosted checkout persists null access code and reuses existing link",
      async () => {
        const r = await registration();
        mode = "pending";
        const p = await service.initialize(r.reference, "USD", "FLUTTERWAVE");
        assert.equal(p.accessCode, null);
        assert.equal(p.amountMinor, 150000);
        const count = requests.length;
        assert.equal(
          (await service.initialize(r.reference, "USD", "FLUTTERWAVE"))
            .paymentReference,
          p.paymentReference,
        );
        assert.equal(requests.length, count);
        await assert.rejects(
          service.initialize(r.reference, "USD", "PAYSTACK"),
          PaymentRetryUnavailableError,
        );
        await assert.rejects(
          service.retry(r.reference, "USD", "PAYSTACK"),
          PaymentRetryUnavailableError,
        );
      },
    );
    await scenario(
      "simultaneous initialization across gateways reserves exactly one attempt",
      async () => {
        const r = await registration();
        mode = "pending";
        const results = await Promise.allSettled([
          service.initialize(r.reference, "USD", "FLUTTERWAVE"),
          service.initialize(r.reference, "USD", "PAYSTACK"),
        ]);
        assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
        assert.equal(
          Number(
            (
              await pool.query(
                "SELECT count(*) FROM payment_transactions WHERE registration_id=$1",
                [r.id],
              )
            ).rows[0].count,
          ),
          1,
        );
      },
    );
    await scenario(
      "webhook hash precedes independent verification; duplicates and callback races finalize once",
      async () => {
        const r = await registration();
        mode = "pending";
        const p = await service.initialize(r.reference, "USD", "FLUTTERWAVE");
        const id = [...txIds].find(([, ref]) => ref === p.paymentReference)![0];
        const payload = {
          event: "charge.completed",
          data: {
            id: Number(id),
            tx_ref: p.paymentReference,
            status: "successful",
          },
        };
        const count = requests.length;
        await request(app)
          .post("/api/payments/flutterwave/webhook")
          .send(payload)
          .expect(401);
        assert.equal(requests.length, count);
        await request(app)
          .post("/api/payments/flutterwave/webhook")
          .set("verif-hash", "wrong")
          .send(payload)
          .expect(401);
        await request(app)
          .post("/api/payments/flutterwave/webhook")
          .set("verif-hash", "mock-webhook-hash-12345678901234567890")
          .send(payload)
          .expect(200);
        assert.equal(
          (await repository.findByReference(p.paymentReference))?.status,
          "PENDING",
        );
        mode = "success";
        const before = completionCalls;
        await Promise.all([
          service.verify(p.paymentReference),
          service.processFlutterwaveWebhook(payload),
          service.processFlutterwaveWebhook(payload),
        ]);
        assert.equal(completionCalls, before + 1);
        assert.equal(
          Number(
            (
              await pool.query(
                "SELECT count(*) FROM payment_events WHERE payment_transaction_id=(SELECT id FROM payment_transactions WHERE provider_reference=$1) AND event_type='PAYMENT_CONFIRMED'",
                [p.paymentReference],
              )
            ).rows[0].count,
          ),
          1,
        );
      },
    );
    await scenario(
      "reference, customer, amount and currency mismatch never settle or release Flutterwave checkout",
      async () => {
        const r = await registration();
        mode = "pending";
        const p = await service.initialize(r.reference, "USD", "FLUTTERWAVE");
        mode = "success";
        for (const bad of [
          { tx_ref: "wrong" },
          { customer: { email: "wrong@example.com" } },
          { amount: "1499.99" },
          { amount: "1500.01" },
          { charged_amount: "1499.99" },
          { currency: "NGN" },
        ]) {
          mismatch = bad;
          await assert.rejects(
            service.verify(p.paymentReference),
            PaymentVerificationMismatchError,
          );
          assert.equal(
            (await repository.findByReference(p.paymentReference))?.status,
            "PENDING",
          );
          await assert.rejects(
            service.retry(r.reference, "USD", "PAYSTACK"),
            PaymentRetryUnavailableError,
          );
        }
        mismatch = {};
        assert.equal((await service.verify(p.paymentReference)).status, "PAID");
      },
    );
    await scenario(
      "initialization timeout remains reserved after aging; not-found and failed charge do not release it",
      async () => {
        const r = await registration();
        mode = "timeout";
        await assert.rejects(
          service.initialize(r.reference, "USD", "FLUTTERWAVE"),
          PaymentRequestError,
        );
        const row = (
          await pool.query(
            "SELECT provider_reference,status FROM payment_transactions WHERE registration_id=$1",
            [r.id],
          )
        ).rows[0];
        assert.equal(row.status, "INITIALIZED");
        await pool.query(
          "UPDATE payment_transactions SET created_at=now()-interval '1 day' WHERE registration_id=$1",
          [r.id],
        );
        mode = "notfound";
        await assert.rejects(
          service.verify(row.provider_reference),
          PaymentRequestError,
        );
        await assert.rejects(
          service.initialize(r.reference, "USD", "FLUTTERWAVE"),
          PaymentInitializationInProgressError,
        );
        await assert.rejects(
          service.retry(r.reference, "USD", "PAYSTACK"),
          PaymentRetryUnavailableError,
        );
        const next = await registration();
        mode = "pending";
        const p = await service.initialize(
          next.reference,
          "USD",
          "FLUTTERWAVE",
        );
        mode = "failed";
        assert.equal(
          (await service.verify(p.paymentReference)).status,
          "PENDING",
        );
        await assert.rejects(
          service.retry(next.reference, "USD", "PAYSTACK"),
          PaymentRetryUnavailableError,
        );
      },
    );
    await scenario(
      "definite checkout rejection allows a later provider switch",
      async () => {
        const r = await registration();
        mode = "reject";
        await assert.rejects(
          service.initialize(r.reference, "USD", "FLUTTERWAVE"),
          PaymentRequestError,
        );
        assert.equal(
          (
            await pool.query(
              "SELECT status FROM payment_transactions WHERE registration_id=$1",
              [r.id],
            )
          ).rows[0].status,
          "FAILED",
        );
        mode = "pending";
        assert.equal(
          (await service.retry(r.reference, "USD", "PAYSTACK")).provider,
          "PAYSTACK",
        );
      },
    );
    await scenario(
      "email eligibility, Student pricing and commercial isolation are unchanged",
      async () => {
        const r = await registration(false);
        await assert.rejects(
          service.initialize(r.reference, "USD", "FLUTTERWAVE"),
          PaymentRegistrationIneligibleError,
        );
        const student = (
          await pool.query(
            "SELECT id FROM delegate_packages WHERE delegate_type='STUDENT'",
          )
        ).rows[0];
        assert.equal(
          Number(
            (
              await pool.query(
                "SELECT count(*) FROM delegate_package_prices WHERE package_id=$1 AND is_active",
                [student.id],
              )
            ).rows[0].count,
          ),
          0,
        );
        assert.equal(
          Number(
            (
              await pool.query(
                "SELECT count(*) FROM payment_transactions pt JOIN delegate_registrations dr ON dr.id=pt.registration_id WHERE dr.package_type_snapshot NOT IN ('PROFESSIONAL','STUDENT')",
              )
            ).rows[0].count,
          ),
          0,
        );
      },
    );
    await scenario(
      "manual confirmation wins; late Flutterwave success becomes non-authoritative duplicate",
      async () => {
        const adminId = randomUUID();
        await pool.query(
          "INSERT INTO admins(id,full_name,email,password_hash,role) VALUES($1,'Test Finance',$2,'synthetic','FINANCE')",
          [adminId, `finance-${adminId}@example.com`],
        );
        const r = await registration();
        mode = "pending";
        const online = await service.initialize(
          r.reference,
          "USD",
          "FLUTTERWAVE",
        );
        const manual = new ManualPaymentService(
          postgresManualPaymentRepository,
          repository,
          completion,
        );
        const record = await manual.record({
          registrationReference: r.reference,
          method: "BANK_TRANSFER",
          currency: "USD",
          amountMinor: 150000,
          externalReference: randomUUID(),
          paymentDate: new Date(),
          adminId,
        });
        await manual.confirm(record.paymentReference, adminId);
        mode = "success";
        assert.equal(
          (await service.verify(online.paymentReference)).status,
          "DUPLICATE_SUCCESS",
        );
        assert.equal(
          (await repository.findByReference(record.paymentReference))?.status,
          "PAID",
        );
        const claimed = await repository.claimReconciliationCandidates(
          25,
          new Date(),
          "TEST",
        );
        for (const c of claimed)
          assert.notEqual(
            (await repository.findByReference(c.paymentReference))?.provider,
            "MANUAL",
          );
      },
    );
    await scenario(
      "reconciliation uses persisted Flutterwave gateway and preserves trusted snapshots",
      async () => {
        const r = await registration();
        mode = "pending";
        const p = await service.initialize(r.reference, "NGN", "FLUTTERWAVE");
        await pool.query(
          "UPDATE payment_transactions SET created_at=now()-interval '3 minutes' WHERE provider_reference=$1",
          [p.paymentReference],
        );
        mode = "success";
        await service.reconcile(25);
        assert.equal(
          (await repository.findByReference(p.paymentReference))?.status,
          "PAID",
        );
      },
    );
    await scenario(
      "Student checkout requires approval and an active price; fixture pricing stays isolated",
      async () => {
        const { StudentVerificationService } =
          await import("../src/services/studentVerification.service.js");
        const { postgresStudentVerificationRepository } =
          await import("../src/repositories/studentVerification.repository.js");
        const studentPackageId = (
          await pool.query(
            "SELECT id FROM delegate_packages WHERE delegate_type='STUDENT'",
          )
        ).rows[0].id;
        const email = `student-${randomUUID()}@example.com`;
        const student = await new StudentVerificationService(
          postgresStudentVerificationRepository,
        ).createApplication({
          packageId: studentPackageId,
          firstName: "Test",
          lastName: "Student",
          email,
          mobile: "+2348000000000",
          country: "Nigeria",
          mainObjective: "Payment eligibility test",
          heardAboutSource: "Test",
          privacyConsent: true,
          dataSharingConsent: false,
          institutionName: "Test University",
          institutionCountry: "Nigeria",
          programmeOfStudy: "Engineering",
          studentIdentificationNumber: "SYNTHETIC-123",
          expectedGraduationYear: 2028,
        });
        await pool.query(
          "UPDATE delegate_registrations SET email_verification_status='VERIFIED', email_verified_at=now() WHERE reference=$1",
          [student.reference],
        );
        mode = "pending";
        await assert.rejects(
          service.initialize(student.reference, "USD", "FLUTTERWAVE"),
          PaymentRegistrationIneligibleError,
        );
        const adminId = (await pool.query("SELECT id FROM admins LIMIT 1"))
          .rows[0].id;
        await pool.query(
          "UPDATE student_verifications SET status='APPROVED',submitted_at=now(),reviewed_at=now(),reviewed_by_admin_id=$1 WHERE registration_id=(SELECT id FROM delegate_registrations WHERE reference=$2)",
          [adminId, student.reference],
        );
        const { PaymentPriceUnavailableError } =
          await import("../src/services/delegatePayment.service.js");
        await assert.rejects(
          service.initialize(student.reference, "USD", "FLUTTERWAVE"),
          PaymentPriceUnavailableError,
        );
        // Synthetic fixture in the disposable schema, never a migration or application price.
        await pool.query(
          "INSERT INTO delegate_package_prices(id,package_id,currency,amount_minor,is_active) VALUES($1,$2,'USD',12300,true)",
          [randomUUID(), studentPackageId],
        );
        const payment = await service.initialize(
          student.reference,
          "USD",
          "FLUTTERWAVE",
        );
        assert.equal(payment.amountMinor, 12300);
        mode = "success";
        assert.equal(
          (await service.verify(payment.paymentReference)).status,
          "PAID",
        );
      },
    );
    await scenario(
      "authenticated Flutterwave events cannot settle Paystack references",
      async () => {
        const r = await registration();
        mode = "pending";
        const p = await service.initialize(r.reference, "USD");
        const before = requests.length;
        assert.deepEqual(
          await service.processFlutterwaveWebhook({
            event: "charge.completed",
            data: { id: 123, tx_ref: p.paymentReference },
          }),
          { processed: false },
        );
        assert.equal(requests.length, before);
        assert.equal(
          (await repository.findByReference(p.paymentReference))?.status,
          "PENDING",
        );
      },
    );
    await scenario(
      "reconciliation mismatch stays reserved without aborting the batch",
      async () => {
        const r = await registration();
        mode = "pending";
        const payment = await service.initialize(
          r.reference,
          "USD",
          "FLUTTERWAVE",
        );
        await pool.query(
          "UPDATE payment_transactions SET created_at=now()-interval '3 minutes' WHERE provider_reference=$1",
          [payment.paymentReference],
        );
        mode = "success";
        mismatch = { currency: "NGN" };
        const summary = await service.reconcile(25);
        assert.ok(summary.providerErrors > 0);
        const stored = await repository.findByReference(
          payment.paymentReference,
        );
        assert.equal(stored?.status, "PENDING");
        assert.equal(stored?.providerStatus, "verification_mismatch");
        mismatch = {};
        assert.equal(
          (await service.verify(payment.paymentReference)).status,
          "PAID",
        );
      },
    );
    await scenario(
      "rollback refuses to delete or invalidate Flutterwave financial history",
      async () => {
        const migrationClient = await setup.connect();
        try {
          await assert.rejects(
            runner({
              dbClient: migrationClient,
              dir: resolve(__dirname, "../migrations"),
              schema,
              migrationsTable: "pgmigrations",
              direction: "down",
              count: 1,
              log: () => {},
            }),
            /Flutterwave transactions prevent rollback/,
          );
        } finally {
          await migrationClient.query("ROLLBACK");
          migrationClient.release();
        }
        assert.ok(
          Number(
            (
              await pool.query(
                "SELECT count(*) FROM payment_transactions WHERE provider='FLUTTERWAVE'",
              )
            ).rows[0].count,
          ) > 0,
        );
      },
    );
    console.log(
      JSON.stringify({
        scenarios: scenarios.length,
        gatewayHTTP: "mocked only",
        postgres: "fresh isolated loopback cluster",
        schema,
      }),
    );
  } finally {
    await closeDatabasePool();
    await setup.query(`DROP SCHEMA "${schema}" CASCADE`);
    await setup.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
