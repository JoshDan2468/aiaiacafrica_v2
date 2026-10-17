/** Local-only synthetic Student payment acceptance. Never calls Paystack or Mailjet. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { env } from "../src/config/env";
import { EmailService } from "../src/email/email.service";
import type { TransactionalEmail } from "../src/email/email.types";
import { PaymentService } from "../src/payments/payment.service";
import type {
  InitializeProviderPaymentInput,
  PaymentProvider,
  VerifiedProviderPayment,
} from "../src/payments/payment.types";
import { postgresAdminOverviewRepository } from "../src/repositories/adminOverview.repository";
import { postgresPaymentCompletionRepository } from "../src/repositories/paymentCompletion.repository";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { postgresReportRepository } from "../src/repositories/report.repository";
import { postgresStudentEvidenceRepository } from "../src/repositories/studentEvidence.repository";
import { postgresStudentVerificationRepository } from "../src/repositories/studentVerification.repository";
import { postgresStudentVerificationWorkflowRepository } from "../src/repositories/studentVerificationWorkflow.repository";
import {
  DelegatePaymentService,
  PaymentPriceUnavailableError,
  PaymentRegistrationIneligibleError,
} from "../src/services/delegatePayment.service";
import { PaymentCompletionService } from "../src/services/paymentCompletion.service";
import { ReportService } from "../src/services/report.service";
import { StudentEvidenceService } from "../src/services/studentEvidence.service";
import { StudentVerificationService } from "../src/services/studentVerification.service";
import { StudentVerificationWorkflowService } from "../src/services/studentVerificationWorkflow.service";
import { LocalStudentEvidenceStorage } from "../src/studentEvidence/local.storage";
import type {
  MalwareScanInput,
  MalwareScanner,
} from "../src/studentEvidence/malwareScanner";

class TestOnlyCleanScanner implements MalwareScanner {
  async scan(_input: MalwareScanInput): Promise<"CLEAN"> {
    return "CLEAN";
  }
}

class StubProvider implements PaymentProvider {
  readonly attempts = new Map<string, InitializeProviderPaymentInput>();
  readonly statuses = new Map<string, string>();
  async initialize(input: InitializeProviderPaymentInput) {
    this.attempts.set(input.reference, input);
    this.statuses.set(input.reference, "pending");
    return {
      reference: input.reference,
      authorizationUrl: `https://checkout.example.test/${input.reference}`,
      accessCode: input.reference,
    };
  }
  async verify(reference: string): Promise<VerifiedProviderPayment> {
    const input = this.attempts.get(reference);
    assert.ok(input);
    return {
      reference,
      status: this.statuses.get(reference) ?? "pending",
      amountMinor: input.amountMinor,
      currency: input.currency,
      providerTransactionId: reference.slice(-24),
      channel: "test",
      gatewayResponse: "Synthetic provider",
      paidAt: new Date(),
      customerEmail: input.email,
    };
  }
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlY4AAAAASUVORK5CYII=",
  "base64",
);

async function main(): Promise<void> {
  if (
    env.nodeEnv === "production" ||
    !env.databaseUrl ||
    !["localhost", "127.0.0.1", "::1"].includes(
      new URL(env.databaseUrl).hostname,
    )
  ) {
    throw new Error(
      "Synthetic acceptance is restricted to a local, non-production PostgreSQL database",
    );
  }
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_URL required");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  const reference = `AIAIAC-DEL-${suffix}`;
  const email = `student-payment-${suffix.toLowerCase()}@example.test`;
  const storageDirectory = await mkdtemp(join(tmpdir(), "aiaiac-p03-"));
  const priceIds: string[] = [];
  const messages: TransactionalEmail[] = [];
  const emailService = new EmailService(
    {
      async send(message) {
        messages.push(message);
      },
    },
    "http://localhost:5173",
  );
  const provider = new StubProvider();
  let registrationId: string | null = null;
  let packageId: string | null = null;
  try {
    const packageResult = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_packages WHERE delegate_type='STUDENT' AND is_active=true LIMIT 1",
    );
    packageId = packageResult.rows[0]?.id ?? null;
    assert.ok(packageId, "Active Student package required");
    const existingPrices = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM delegate_package_prices WHERE package_id=$1",
      [packageId],
    );
    assert.equal(
      existingPrices.rows[0]?.count,
      "0",
      "Do not alter an existing Student price",
    );
    const professionalPrices = await pool.query<{
      currency: string;
      amount_minor: number;
    }>(
      `SELECT dpp.currency,dpp.amount_minor FROM delegate_package_prices dpp
       JOIN delegate_packages dp ON dp.id=dpp.package_id
       WHERE dp.delegate_type='PROFESSIONAL' AND dpp.is_active=true`,
    );
    assert.deepEqual(
      Object.fromEntries(
        professionalPrices.rows.map((row) => [row.currency, row.amount_minor]),
      ),
      { USD: 150000, NGN: 210000000 },
    );
    const adminResult = await pool.query<{ id: string; email: string }>(
      "SELECT id,email FROM admins WHERE is_active=true AND role='SUPER_ADMIN' LIMIT 1",
    );
    const admin = adminResult.rows[0];
    assert.ok(admin, "Active Super Admin required for notification acceptance");
    const before = (await postgresAdminOverviewRepository.getOverview())
      .metrics;
    const application = await new StudentVerificationService(
      postgresStudentVerificationRepository,
      () => reference,
    ).createApplication({
      packageId,
      firstName: "Synthetic",
      lastName: "Student",
      email,
      mobile: "+2348000000000",
      country: "Nigeria",
      mainObjective: "P0.3 controlled acceptance",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
      institutionName: "Synthetic University",
      institutionCountry: "Nigeria",
      programmeOfStudy: "Engineering",
      studentIdentificationNumber: `TEST-${suffix}`,
      expectedGraduationYear: 2028,
      institutionalEmail: email,
    });
    const idResult = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_registrations WHERE reference=$1",
      [reference],
    );
    registrationId = idResult.rows[0]?.id ?? null;
    assert.ok(registrationId);
    const evidence = new StudentEvidenceService(
      postgresStudentEvidenceRepository,
      new LocalStudentEvidenceStorage(storageDirectory),
      new TestOnlyCleanScanner(),
    );
    const authorization = await evidence.authorizeContinuation(
      reference,
      application.continuationToken,
    );
    const workflow = new StudentVerificationWorkflowService(
      postgresStudentVerificationWorkflowRepository,
      emailService,
    );
    const completion = new PaymentCompletionService(
      postgresPaymentCompletionRepository,
      emailService,
      ["SUPER_ADMIN"],
    );
    const payment = new DelegatePaymentService(
      postgresPaymentRepository,
      new PaymentService(provider),
      completion,
      "http://localhost:5173/registration/payment/callback",
    );
    await assert.rejects(
      () => payment.initialize(reference, "USD"),
      PaymentRegistrationIneligibleError,
    );
    await evidence.upload(authorization, "CURRENT_STUDENT_ID", {
      originalname: "student-id.png",
      mimetype: "image/png",
      size: png.length,
      buffer: png,
    });
    await evidence.upload(authorization, "COURSE_REGISTRATION", {
      originalname: "enrolment.png",
      mimetype: "image/png",
      size: png.length,
      buffer: png,
    });
    await workflow.submit(authorization);
    await assert.rejects(
      () => payment.initialize(reference, "NGN"),
      PaymentRegistrationIneligibleError,
    );
    await workflow.review(
      reference,
      "APPROVED",
      admin.id,
      "Synthetic clean evidence.",
    );
    assert.equal(
      (await workflow.getStudentState(authorization))?.paymentAvailable,
      false,
    );
    await assert.rejects(
      () => payment.initialize(reference, "USD"),
      PaymentRegistrationIneligibleError,
    );
    await pool.query(
      `UPDATE delegate_registrations
       SET email_verification_status='VERIFIED',email_verified_at=current_timestamp
       WHERE reference=$1`,
      [reference],
    );
    await assert.rejects(
      () => payment.initialize(reference, "USD"),
      PaymentPriceUnavailableError,
    );
    const unpriced = (await postgresAdminOverviewRepository.getOverview())
      .metrics;
    assert.equal(unpriced.totalRegistrations, before.totalRegistrations + 1);
    assert.equal(unpriced.pendingPayments, before.pendingPayments);

    const testPrices = [
      { currency: "USD", amountMinor: 12300 },
      { currency: "NGN", amountMinor: 456700 },
    ] as const;
    const priceClient = await pool.connect();
    try {
      await priceClient.query("BEGIN");
      for (const price of testPrices) {
        const id = randomUUID();
        await priceClient.query(
          "INSERT INTO delegate_package_prices(id,package_id,currency,amount_minor,is_active) VALUES($1,$2,$3,$4,true)",
          [id, packageId, price.currency, price.amountMinor],
        );
        priceIds.push(id);
      }
      await priceClient.query("COMMIT");
    } catch (error) {
      await priceClient.query("ROLLBACK");
      throw error;
    } finally {
      priceClient.release();
    }
    const pricedState = await workflow.getStudentState(authorization);
    assert.equal(pricedState?.paymentAvailable, true);
    assert.deepEqual(pricedState?.availablePrices, testPrices);
    const priced = (await postgresAdminOverviewRepository.getOverview())
      .metrics;
    assert.equal(priced.pendingPayments, before.pendingPayments + 1);

    const usd = await payment.initialize(reference, "USD");
    assert.equal(usd.amountMinor, 12300);
    provider.statuses.set(usd.paymentReference, "failed");
    assert.equal((await payment.verify(usd.paymentReference)).status, "FAILED");
    const ngn = await payment.initialize(reference, "NGN");
    assert.equal(ngn.amountMinor, 456700);
    provider.statuses.set(ngn.paymentReference, "success");
    assert.equal((await payment.verify(ngn.paymentReference)).status, "PAID");
    assert.equal((await payment.verify(ngn.paymentReference)).status, "PAID");
    assert.equal((await payment.verify(usd.paymentReference)).status, "FAILED");
    assert.equal(
      (
        await payment.processPaystackWebhook({
          event: "charge.success",
          data: {
            id: ngn.paymentReference,
            status: "success",
            reference: ngn.paymentReference,
            amount: ngn.amountMinor,
            currency: "NGN",
            customer: { email },
          },
        })
      ).status,
      "PAID",
    );
    const passes = await pool.query<{ count: string; hash: string }>(
      "SELECT count(*)::text AS count, min(credential_hash) AS hash FROM delegate_event_passes WHERE registration_id=$1",
      [registrationId],
    );
    assert.equal(passes.rows[0]?.count, "1");
    assert.match(passes.rows[0]?.hash ?? "", /^[a-f0-9]{64}$/);
    const delegateMessages = messages.filter(
      (message) =>
        message.toEmail === email &&
        message.subject.includes("Payment Confirmed"),
    );
    assert.equal(delegateMessages.length, 1);
    assert.match(delegateMessages[0]?.text ?? "", /Category: Student Delegate/);
    assert.match(delegateMessages[0]?.text ?? "", /₦4,567\.00 \(NGN\)/);
    assert.match(delegateMessages[0]?.html ?? "", /cid:aiaiac-event-pass-qr/);
    assert.doesNotMatch(
      (delegateMessages[0]?.text ?? "") + (delegateMessages[0]?.html ?? ""),
      /AIAIAC-PASS-/,
    );
    const adminMessages = messages.filter(
      (message) =>
        message.toEmail === admin.email &&
        message.subject.includes("Payment Received"),
    );
    assert.equal(adminMessages.length, 1);
    assert.match(adminMessages[0]?.text ?? "", /Category: Student Delegate/);
    const after = (await postgresAdminOverviewRepository.getOverview()).metrics;
    assert.equal(after.paidRegistrations, before.paidRegistrations + 1);
    assert.equal(after.pendingPayments, before.pendingPayments);
    assert.equal(
      after.confirmedRevenue.NGN,
      before.confirmedRevenue.NGN + ngn.amountMinor,
    );
    assert.equal(after.confirmedRevenue.USD, before.confirmedRevenue.USD);
    const reports = new ReportService(postgresReportRepository);
    const studentReport = await reports.preview("students", {
      page: 1,
      limit: 100,
    });
    const paymentReport = await reports.preview("payments", {
      page: 1,
      limit: 100,
    });
    assert.equal(
      studentReport.items.find((item) => item.reference === reference)
        ?.verificationStatus,
      "APPROVED",
    );
    const paidRow = paymentReport.items.find(
      (item) => item.paymentReference === ngn.paymentReference,
    );
    assert.equal(paidRow?.paymentStatus, "PAID");
    assert.equal(paidRow?.category, "Student Delegate");
    assert.equal(paidRow?.currency, "NGN");
    assert.equal(
      (await workflow.getStudentState(authorization))?.paymentAvailable,
      false,
    );
    console.log(
      JSON.stringify({
        acceptance: "PASS",
        syntheticPriceCurrencies: ["USD", "NGN"],
        paidCurrency: "NGN",
        oneEventPass: true,
        oneDelegateEmail: true,
        adminNotification: true,
        overviewAndReports: true,
        realProviderCalls: 0,
      }),
    );
  } finally {
    if (registrationId) {
      await pool.query(
        "DELETE FROM delegate_event_passes WHERE registration_id=$1",
        [registrationId],
      );
      await pool.query(
        "UPDATE delegate_registrations SET authoritative_payment_transaction_id=NULL WHERE id=$1",
        [registrationId],
      );
      await pool.query(
        "DELETE FROM payment_transactions WHERE registration_id=$1",
        [registrationId],
      );
      await pool.query("DELETE FROM delegate_registrations WHERE id=$1", [
        registrationId,
      ]);
    }
    if (priceIds.length)
      await pool.query(
        "DELETE FROM delegate_package_prices WHERE id=ANY($1::uuid[])",
        [priceIds],
      );
    if (packageId) {
      const remaining = await pool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM delegate_package_prices WHERE package_id=$1 AND is_active=true",
        [packageId],
      );
      assert.equal(
        remaining.rows[0]?.count,
        "0",
        "Student package must be unpriced after cleanup",
      );
    }
    const fixture = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM delegate_registrations WHERE reference=$1",
      [reference],
    );
    assert.equal(
      fixture.rows[0]?.count,
      "0",
      "Synthetic Student registration must be removed",
    );
    console.log(
      JSON.stringify({
        cleanup: "PASS",
        activeStudentPrices: 0,
        syntheticRegistrations: 0,
      }),
    );
    if (storageDirectory.startsWith(join(tmpdir(), "aiaiac-p03-"))) {
      await rm(storageDirectory, { recursive: true, force: true });
    }
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Student acceptance failed",
  );
  process.exitCode = 1;
});
