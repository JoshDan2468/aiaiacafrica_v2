import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { EmailService } from "../src/email/email.service";
import type { TransactionalEmail } from "../src/email/email.types";
import { PaymentService } from "../src/payments/payment.service";
import type {
  InitializeProviderPaymentInput,
  PaymentProvider,
  VerifiedProviderPayment,
} from "../src/payments/payment.types";
import { postgresAdminOverviewRepository } from "../src/repositories/adminOverview.repository";
import { postgresDelegateRepository } from "../src/repositories/delegate.repository";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { postgresPaymentCompletionRepository } from "../src/repositories/paymentCompletion.repository";
import { postgresReportRepository } from "../src/repositories/report.repository";
import { DelegateService } from "../src/services/delegate.service";
import { DelegatePaymentService } from "../src/services/delegatePayment.service";
import { PaymentCompletionService } from "../src/services/paymentCompletion.service";
import { ReportService } from "../src/services/report.service";

class StubProvider implements PaymentProvider {
  readonly attempts = new Map<string, InitializeProviderPaymentInput>();
  readonly statuses = new Map<string, string>();

  async initialize(input: InitializeProviderPaymentInput) {
    this.attempts.set(input.reference, input);
    this.statuses.set(input.reference, "pending");
    return {
      reference: input.reference,
      authorizationUrl: `https://checkout.paystack.com/${input.reference}`,
      accessCode: input.reference,
    };
  }

  async verify(reference: string): Promise<VerifiedProviderPayment> {
    const attempt = this.attempts.get(reference);
    assert.ok(attempt);
    return {
      reference,
      status: this.statuses.get(reference) ?? "pending",
      amountMinor: attempt.amountMinor,
      currency: attempt.currency,
      providerTransactionId: reference.slice(-24),
      channel: "card",
      gatewayResponse: "Stub response",
      paidAt: new Date(),
      customerEmail: attempt.email,
    };
  }
}

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool)
    throw new Error("DATABASE_URL required for payment retry acceptance");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  const registrationReference = `AIAIAC-DEL-${suffix}`;
  const email = `payment-retry-${suffix.toLowerCase()}@example.com`;
  let registrationId: string | null = null;
  const provider = new StubProvider();
  const delivered: TransactionalEmail[] = [];
  const emailService = new EmailService(
    {
      async send(message) {
        delivered.push(message);
      },
    },
    "http://localhost:5173",
  );
  const completion = new PaymentCompletionService(
    postgresPaymentCompletionRepository,
    emailService,
    ["SUPER_ADMIN"],
  );
  const paymentService = new DelegatePaymentService(
    postgresPaymentRepository,
    new PaymentService(provider),
    completion,
    "http://localhost:5173/registration/payment/callback",
  );
  const reports = new ReportService(postgresReportRepository);

  try {
    const packageRow = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_packages WHERE delegate_type='PROFESSIONAL' AND is_active=true LIMIT 1",
    );
    assert.ok(packageRow.rows[0]);
    const before = (await postgresAdminOverviewRepository.getOverview())
      .metrics;
    const registration = await new DelegateService(
      postgresDelegateRepository,
      () => registrationReference,
    ).createRegistration({
      packageId: packageRow.rows[0].id,
      firstName: "Payment",
      lastName: "Retry Test",
      email,
      mobile: "+2348000000000",
      jobTitle: "Acceptance Test",
      companyName: "AIAIAC Test",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Verify payment retry state",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    registrationId = registration.id;
    await pool.query(
      `UPDATE delegate_registrations
       SET email_verification_status='VERIFIED',email_verified_at=current_timestamp
       WHERE id=$1`,
      [registrationId],
    );
    const pending = (await postgresAdminOverviewRepository.getOverview())
      .metrics;
    assert.equal(pending.pendingPayments, before.pendingPayments + 1);

    const attemptA = await paymentService.initialize(
      registrationReference,
      "NGN",
    );
    provider.statuses.set(attemptA.paymentReference, "failed");
    assert.equal(
      (await paymentService.verify(attemptA.paymentReference)).status,
      "FAILED",
    );
    assert.equal(
      (await postgresDelegateRepository.findRegistrationById(registrationId))
        ?.paymentStatus,
      "FAILED",
    );

    const attemptB = await paymentService.initialize(
      registrationReference,
      "NGN",
    );
    assert.notEqual(attemptB.paymentReference, attemptA.paymentReference);
    provider.statuses.set(attemptB.paymentReference, "success");
    assert.equal(
      (await paymentService.verify(attemptB.paymentReference)).status,
      "PAID",
    );
    provider.statuses.set(attemptA.paymentReference, "success");
    assert.equal(
      (await paymentService.verify(attemptA.paymentReference)).status,
      "DUPLICATE_SUCCESS",
    );
    assert.equal(
      (await paymentService.verify(attemptB.paymentReference)).status,
      "PAID",
    );
    assert.equal(
      (
        await paymentService.processPaystackWebhook({
          event: "charge.success",
          data: {
            id: attemptB.paymentReference,
            status: "success",
            reference: attemptB.paymentReference,
            amount: attemptB.amountMinor,
            currency: attemptB.currency,
            customer: { email },
          },
        })
      ).status,
      "PAID",
    );

    const detail =
      await postgresDelegateRepository.findRegistrationById(registrationId);
    assert.equal(detail?.paymentStatus, "PAID");
    const delegateQueue = await postgresDelegateRepository.listRegistrations({
      page: 1,
      limit: 10,
      search: registrationReference,
      sort: "submitted_desc",
    });
    assert.equal(delegateQueue.items[0]?.paymentStatus, "PAID");
    const paymentQueue = await postgresPaymentRepository.listPayments({
      page: 1,
      limit: 10,
      search: registrationReference,
    });
    assert.deepEqual(
      new Map(
        paymentQueue.items.map((item) => [item.paymentReference, item.status]),
      ),
      new Map([
        [attemptA.paymentReference, "DUPLICATE_SUCCESS"],
        [attemptB.paymentReference, "PAID"],
      ]),
    );
    assert.equal(
      (
        await postgresPaymentRepository.findPaymentDetail(
          attemptA.paymentReference,
        )
      )?.status,
      "DUPLICATE_SUCCESS",
    );
    assert.equal(
      (
        await postgresPaymentRepository.findPaymentDetail(
          attemptB.paymentReference,
        )
      )?.status,
      "PAID",
    );

    const after = (await postgresAdminOverviewRepository.getOverview()).metrics;
    assert.equal(after.totalRegistrations, before.totalRegistrations + 1);
    assert.equal(after.paidRegistrations, before.paidRegistrations + 1);
    assert.equal(after.pendingPayments, before.pendingPayments);
    assert.equal(
      after.confirmedRevenue.NGN,
      before.confirmedRevenue.NGN + attemptB.amountMinor,
    );
    assert.equal(after.confirmedRevenue.USD, before.confirmedRevenue.USD);

    const passes = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM delegate_event_passes WHERE registration_id=$1 AND status='ACTIVE'",
      [registrationId],
    );
    assert.equal(passes.rows[0]?.count, "1");
    assert.equal(
      delivered.filter((message) => message.toEmail === email).length,
      1,
    );
    const notificationRows = await pool.query<{
      status: string;
      notification_type: string;
    }>(
      `SELECT pan.status, pan.notification_type FROM payment_admin_notifications pan
       JOIN payment_transactions pt ON pt.id=pan.payment_transaction_id
       WHERE pt.registration_id=$1`,
      [registrationId],
    );
    assert.ok(notificationRows.rows.length > 0);
    assert.ok(notificationRows.rows.every((row) => row.status === "SENT"));
    assert.ok(
      notificationRows.rows.some(
        (row) => row.notification_type === "PAYMENT_CONFIRMED",
      ),
    );
    assert.ok(
      notificationRows.rows.some(
        (row) => row.notification_type === "RECONCILIATION_REQUIRED",
      ),
    );
    assert.equal(delivered.length, 1 + notificationRows.rows.length);

    const delegateReport = await reports.preview("delegates", {
      page: 1,
      limit: 20,
    });
    const paymentReport = await reports.preview("payments", {
      page: 1,
      limit: 20,
    });
    assert.equal(
      delegateReport.items.find(
        (item) => item.reference === registrationReference,
      )?.paymentStatus,
      "PAID",
    );
    assert.deepEqual(
      new Map(
        paymentReport.items
          .filter(
            (item) => item.registrationReference === registrationReference,
          )
          .map((item) => [item.paymentReference, item.paymentStatus]),
      ),
      new Map([
        [attemptA.paymentReference, "DUPLICATE_SUCCESS"],
        [attemptB.paymentReference, "PAID"],
      ]),
    );
    console.log(
      JSON.stringify({
        failedThenPaid: true,
        staleFailureCannotDowngrade: true,
        adminAndReportsConsistent: true,
        oneEventPass: true,
        oneDelegateConfirmation: true,
        delayedSuccessQuarantined: true,
        reconciliationAlertSent: true,
        adminNotifications: notificationRows.rows.length,
        noRealProviderCalls: true,
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
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
