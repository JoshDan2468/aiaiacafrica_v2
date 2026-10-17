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
import { postgresDelegateRegistrationAcknowledgementRepository } from "../src/repositories/delegateRegistrationAcknowledgement.repository";
import { postgresDelegateRepository } from "../src/repositories/delegate.repository";
import { postgresEmailVerificationRepository } from "../src/repositories/emailVerification.repository";
import { postgresPaymentCompletionRepository } from "../src/repositories/paymentCompletion.repository";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { postgresRegistrationRecoveryRepository } from "../src/repositories/registrationRecovery.repository";
import {
  DelegatePaymentService,
  PaymentRetryUnavailableError,
} from "../src/services/delegatePayment.service";
import { DelegateRegistrationAcknowledgementService } from "../src/services/delegateRegistrationAcknowledgement.service";
import { DelegateService } from "../src/services/delegate.service";
import { EmailVerificationService } from "../src/services/emailVerification.service";
import { PaymentCompletionService } from "../src/services/paymentCompletion.service";
import { RegistrationNotificationService } from "../src/services/registrationNotification.service";
import {
  RegistrationRecoveryService,
  RegistrationRecoveryTokenError,
  hashRegistrationRecoveryToken,
} from "../src/services/registrationRecovery.service";

class StubProvider implements PaymentProvider {
  readonly attempts = new Map<string, InitializeProviderPaymentInput>();
  readonly statuses = new Map<string, string>();

  async initialize(input: InitializeProviderPaymentInput) {
    this.attempts.set(input.reference, input);
    this.statuses.set(input.reference, "pending");
    return {
      reference: input.reference,
      authorizationUrl: `https://checkout.paystack.test/${input.reference}`,
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
      gatewayResponse: "Synthetic acceptance response",
      paidAt: new Date(),
      customerEmail: attempt.email,
    };
  }
}

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_URL required for registration recovery acceptance");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  const registrationReference = `AIAIAC-DEL-${suffix}`;
  const email = `recovery-${suffix.toLowerCase()}@example.com`;
  const verificationToken = "V".repeat(43);
  const automaticFailedRecoveryToken = "F".repeat(43);
  const repeatedFailedRecoveryToken = "Q".repeat(43);
  const unknownRecoveryToken = "M".repeat(43);
  const recoveryToken = "R".repeat(43);
  const continuationToken = "C".repeat(43);
  const abandonedRecoveryToken = "B".repeat(43);
  let registrationId: string | null = null;
  const delivered: TransactionalEmail[] = [];
  let failPaymentRecoveryDelivery = false;
  const emailService = new EmailService(
    {
      async send(message) {
        if (
          failPaymentRecoveryDelivery &&
          message.subject.includes("Check or Retry Your AIAIAC Africa 2027 Payment")
        ) {
          throw new Error("Synthetic payment recovery delivery failure");
        }
        delivered.push(message);
      },
    },
    "https://admin.example.test",
    "https://conference.example.test",
  );
  const emailVerification = new EmailVerificationService(
    postgresEmailVerificationRepository,
    emailService,
    24,
    () => new Date(),
    () => verificationToken,
  );
  const notifications = new RegistrationNotificationService(
    postgresRegistrationRecoveryRepository,
    emailService,
    ["SUPER_ADMIN"],
  );
  const delegateService = new DelegateService(
    postgresDelegateRepository,
    () => registrationReference,
    new DelegateRegistrationAcknowledgementService(
      postgresDelegateRegistrationAcknowledgementRepository,
      emailService,
    ),
    emailVerification,
    notifications,
  );
  const provider = new StubProvider();
  const completion = new PaymentCompletionService(
    postgresPaymentCompletionRepository,
    emailService,
    ["SUPER_ADMIN"],
  );
  const references = [
    `AIAIAC-PAY-${"A".repeat(24)}`,
    `AIAIAC-PAY-${"D".repeat(24)}`,
    `AIAIAC-PAY-${"C".repeat(24)}`,
  ];
  const recoveryTokens = [
    automaticFailedRecoveryToken,
    repeatedFailedRecoveryToken,
    unknownRecoveryToken,
    recoveryToken,
    continuationToken,
    abandonedRecoveryToken,
  ];
  const recovery = new RegistrationRecoveryService(
    postgresRegistrationRecoveryRepository,
    emailService,
    30,
    24,
    () => new Date(),
    () => recoveryTokens.shift() ?? "Z".repeat(43),
  );
  const payments = new DelegatePaymentService(
    postgresPaymentRepository,
    new PaymentService(provider),
    completion,
    "https://conference.example.test/registration/payment/callback",
    () =>
      references.shift() ??
      `AIAIAC-PAY-${randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`,
    recovery,
  );

  try {
    const packageResult = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_packages WHERE delegate_type='PROFESSIONAL' AND is_active=true LIMIT 1",
    );
    assert.ok(packageResult.rows[0]);
    const baseline = (await postgresAdminOverviewRepository.getOverview()).metrics;
    const registration = await delegateService.createRegistration({
      packageId: packageResult.rows[0].id,
      firstName: "Recovery",
      lastName: "Acceptance",
      email,
      mobile: "+2348000000000",
      jobTitle: "Tester",
      companyName: "AIAIAC Test",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Verify secure registration recovery and retry behavior",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    registrationId = registration.id;
    assert.equal(registration.emailVerificationStatus, "UNVERIFIED");
    assert.equal(registration.verificationEmailSent, true);
    assert.ok(delivered.some((message) => message.subject.includes("Registration Received")));
    assert.ok(delivered.some((message) => message.subject.includes("New Professional Delegate")));
    const verificationEmail = delivered.find((message) => message.subject.includes("Verify your email"));
    assert.ok(verificationEmail?.text.includes("https://conference.example.test/registration/verify-email#"));
    assert.ok(!verificationEmail?.text.includes("token=" + hashRegistrationRecoveryToken(verificationToken)));
    await assert.rejects(() => payments.initialize(registrationReference, "NGN"));

    const verified = await emailVerification.verify(verificationToken);
    assert.equal(verified.kind, "VERIFIED");
    const attemptA = await payments.initialize(registrationReference, "NGN");
    provider.statuses.set(attemptA.paymentReference, "failed");
    assert.equal((await payments.verify(attemptA.paymentReference)).status, "FAILED");
    assert.equal(
      (await postgresDelegateRepository.findRegistrationById(registrationId))?.paymentStatus,
      "FAILED",
    );
    const automaticRecovery = delivered.find((message) =>
      message.subject.includes("Check or Retry Your AIAIAC Africa 2027 Payment"),
    );
    assert.ok(automaticRecovery?.text.includes("registration has been saved"));
    assert.ok(automaticRecovery?.text.includes("Professional Delegate"));
    assert.ok(automaticRecovery?.text.includes(registrationReference));
    assert.ok(automaticRecovery?.text.includes("Check payment status or retry securely"));
    assert.ok(!automaticRecovery?.text.includes(registrationId));
    const recoveryDeliveriesAfterFailure = delivered.length;
    assert.equal((await payments.verify(attemptA.paymentReference)).status, "FAILED");
    assert.equal(delivered.length, recoveryDeliveriesAfterFailure);
    const paymentRecoveryLedger = await pool.query<{ status: string; attempts: number }>(
      `SELECT status,attempts FROM payment_recovery_notifications
       WHERE payment_transaction_id=(SELECT id FROM payment_transactions WHERE provider_reference=$1)`,
      [attemptA.paymentReference],
    );
    assert.deepEqual(paymentRecoveryLedger.rows, [{ status: "SENT", attempts: 1 }]);

    const beforeUnknown = delivered.length;
    await recovery.request(`missing-${email}`);
    assert.equal(delivered.length, beforeUnknown);
    await recovery.request(email);
    const recoveryEmail = delivered.find((message) => message.subject.includes("Continue your registration"));
    assert.ok(recoveryEmail?.text.includes("https://conference.example.test/registration/continue#"));
    const stored = await pool.query<{
      recovery_token_hash: string;
      continuation_token_hash: string | null;
    }>(
      "SELECT recovery_token_hash,continuation_token_hash FROM delegate_registration_recovery WHERE registration_id=$1",
      [registrationId],
    );
    assert.equal(stored.rows[0]?.recovery_token_hash.trim(), hashRegistrationRecoveryToken(recoveryToken));
    assert.equal(stored.rows[0]?.continuation_token_hash, null);
    assert.ok(!JSON.stringify(stored.rows[0]).includes(recoveryToken));

    const access = await recovery.exchange(recoveryToken);
    assert.equal(access.workspace.paymentStatus, "FAILED");
    assert.equal(access.workspace.latestPaymentStatus, "FAILED");
    assert.equal(access.workspace.delegateName, "Recovery Acceptance");
    assert.equal(access.workspace.eventPassStatus, null);
    assert.equal(access.workspace.emailVerificationStatus, "VERIFIED");
    assert.equal(access.workspace.delegateType, "PROFESSIONAL");
    assert.equal(access.continuationToken, continuationToken);
    await assert.rejects(() => recovery.exchange(recoveryToken), RegistrationRecoveryTokenError);
    await assert.rejects(() => recovery.authorize("X".repeat(43)), RegistrationRecoveryTokenError);
    assert.equal(
      (await recovery.authorize(continuationToken)).registrationReference,
      registrationReference,
    );

    const attemptB = await payments.retry(registrationReference, "NGN");
    assert.notEqual(attemptB.paymentReference, attemptA.paymentReference);
    assert.equal((await postgresPaymentRepository.findByReference(attemptA.paymentReference))?.status, "FAILED");
    await assert.rejects(
      () => payments.retry(registrationReference, "NGN"),
      PaymentRetryUnavailableError,
    );
    assert.equal(
      (await postgresPaymentRepository.findByReference(attemptB.paymentReference))?.status,
      "PENDING",
    );
    provider.statuses.set(attemptB.paymentReference, "abandoned");
    failPaymentRecoveryDelivery = true;
    assert.equal((await payments.verify(attemptB.paymentReference)).status, "ABANDONED");
    failPaymentRecoveryDelivery = false;
    assert.equal(
      (await postgresPaymentRepository.findByReference(attemptB.paymentReference))?.status,
      "ABANDONED",
    );
    const failedDeliveryLedger = await pool.query<{ status: string; attempts: number }>(
      `SELECT status,attempts FROM payment_recovery_notifications
       WHERE payment_transaction_id=(SELECT id FROM payment_transactions WHERE provider_reference=$1)`,
      [attemptB.paymentReference],
    );
    assert.deepEqual(failedDeliveryLedger.rows, [{ status: "FAILED", attempts: 1 }]);
    await recovery.sendPaymentRecovery(attemptB.paymentReference);
    const retriedDeliveryLedger = await pool.query<{ status: string; attempts: number }>(
      `SELECT status,attempts FROM payment_recovery_notifications
       WHERE payment_transaction_id=(SELECT id FROM payment_transactions WHERE provider_reference=$1)`,
      [attemptB.paymentReference],
    );
    assert.deepEqual(retriedDeliveryLedger.rows, [{ status: "SENT", attempts: 2 }]);
    const attemptC = await payments.retry(registrationReference, "NGN");
    assert.notEqual(attemptC.paymentReference, attemptB.paymentReference);
    assert.equal((await postgresPaymentRepository.findByReference(attemptB.paymentReference))?.status, "ABANDONED");
    provider.statuses.set(attemptC.paymentReference, "success");
    assert.equal((await payments.verify(attemptC.paymentReference)).status, "PAID");
    const deliveredAfterPayment = delivered.length;
    await recovery.sendPaymentRecovery(attemptC.paymentReference);
    assert.equal(delivered.length, deliveredAfterPayment);
    provider.statuses.set(attemptA.paymentReference, "success");
    assert.equal((await payments.verify(attemptA.paymentReference)).status, "DUPLICATE_SUCCESS");

    const authoritative = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM payment_transactions
       WHERE registration_id=$1 AND financial_authority='AUTHORITATIVE'`,
      [registrationId],
    );
    const passes = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM delegate_event_passes WHERE registration_id=$1 AND status='ACTIVE'",
      [registrationId],
    );
    assert.equal(authoritative.rows[0]?.count, "1");
    assert.equal(passes.rows[0]?.count, "1");
    assert.equal(
      delivered.filter(
        (message) => message.toEmail === email && message.subject.includes("Payment Confirmed"),
      ).length,
      1,
    );
    const after = (await postgresAdminOverviewRepository.getOverview()).metrics;
    assert.equal(after.totalRegistrations, baseline.totalRegistrations + 1);
    assert.equal(after.paidRegistrations, baseline.paidRegistrations + 1);
    assert.equal(after.confirmedRevenue.NGN, baseline.confirmedRevenue.NGN + attemptC.amountMinor);

    await notifications.send(registrationReference);
    const notificationRows = await pool.query<{ status: string; attempts: number }>(
      "SELECT status,attempts FROM delegate_registration_admin_notifications WHERE registration_id=$1",
      [registrationId],
    );
    assert.ok(notificationRows.rows.length > 0);
    assert.ok(notificationRows.rows.every((row) => row.status === "SENT" && row.attempts === 1));

    console.log(
      JSON.stringify({
        scenarios: 27,
        persistedBeforePayment: true,
        verificationRuntimePath: true,
        hashOnlyRecovery: true,
        singleUseRecovery: true,
        authorizedWorkspace: true,
        failedThenAbandonedThenPaid: true,
        oneAuthoritativePayment: true,
        oneEventPass: true,
        oneConfirmation: true,
        delayedSuccessQuarantined: true,
        notificationIdempotent: true,
        revenueSingleCounted: true,
        noRealProviderCalls: true,
      }),
    );
  } finally {
    if (registrationId) {
      await pool.query("DELETE FROM delegate_event_passes WHERE registration_id=$1", [registrationId]);
      await pool.query(
        "UPDATE delegate_registrations SET authoritative_payment_transaction_id=NULL WHERE id=$1",
        [registrationId],
      );
      await pool.query("DELETE FROM payment_transactions WHERE registration_id=$1", [registrationId]);
      await pool.query("DELETE FROM delegate_registrations WHERE id=$1", [registrationId]);
    }
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
