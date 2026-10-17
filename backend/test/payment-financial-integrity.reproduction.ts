import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { PaymentService } from "../src/payments/payment.service";
import type {
  InitializeProviderPaymentInput,
  PaymentProvider,
  VerifiedProviderPayment,
} from "../src/payments/payment.types";
import { postgresDelegateRepository } from "../src/repositories/delegate.repository";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { DelegateService } from "../src/services/delegate.service";
import { DelegatePaymentService } from "../src/services/delegatePayment.service";

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
      gatewayResponse: "Controlled provider stub",
      paidAt: new Date(),
      customerEmail: attempt.email,
    };
  }
}

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_URL required");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  const registrationReference = `AIAIAC-DEL-${suffix}`;
  const provider = new StubProvider();
  let registrationId: string | undefined;
  let concurrentRegistrationId: string | undefined;
  let reconciliationRegistrationId: string | undefined;
  try {
    const packageResult = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_packages WHERE delegate_type='PROFESSIONAL' AND is_active=true LIMIT 1",
    );
    assert.ok(packageResult.rows[0]);
    const registration = await new DelegateService(
      postgresDelegateRepository,
      () => registrationReference,
    ).createRegistration({
      packageId: packageResult.rows[0].id,
      firstName: "Integrity",
      lastName: "Reproduction",
      email: `integrity-${suffix.toLowerCase()}@example.com`,
      mobile: "+2348000000000",
      jobTitle: "Test",
      companyName: "AIAIAC",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Controlled delayed-success reproduction",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    registrationId = registration.id;
    await pool.query(
      `UPDATE delegate_registrations SET email_verification_status='VERIFIED',
       email_verified_at=current_timestamp WHERE id=$1`,
      [registrationId],
    );
    const service = new DelegatePaymentService(
      postgresPaymentRepository,
      new PaymentService(provider),
      { async process() {} },
      "http://localhost/callback",
    );

    const attemptA = await service.initialize(registrationReference, "NGN");
    provider.statuses.set(attemptA.paymentReference, "failed");
    assert.equal(
      (await service.verify(attemptA.paymentReference)).status,
      "FAILED",
    );

    const attemptB = await service.initialize(registrationReference, "NGN");
    provider.statuses.set(attemptB.paymentReference, "success");
    assert.equal(
      (await service.verify(attemptB.paymentReference)).status,
      "PAID",
    );

    provider.statuses.set(attemptA.paymentReference, "success");
    const delayedA = await service.verify(attemptA.paymentReference);
    const observed = await pool.query<{ paid_count: string; revenue: string }>(
      `SELECT count(*) FILTER (WHERE status='PAID')::text AS paid_count,
              COALESCE(sum(amount_minor) FILTER (WHERE status='PAID'),0)::text AS revenue
       FROM payment_transactions WHERE registration_id=$1`,
      [registrationId],
    );
    console.log(
      JSON.stringify({ delayedA: delayedA.status, ...observed.rows[0] }),
    );
    assert.equal(delayedA.status, "DUPLICATE_SUCCESS");
    assert.equal(observed.rows[0]?.paid_count, "1");
    assert.equal(Number(observed.rows[0]?.revenue), attemptA.amountMinor);

    const concurrentSuffix = randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();
    const concurrentReference = `AIAIAC-DEL-${concurrentSuffix}`;
    const concurrentRegistration = await new DelegateService(
      postgresDelegateRepository,
      () => concurrentReference,
    ).createRegistration({
      packageId: packageResult.rows[0].id,
      firstName: "Integrity",
      lastName: "Concurrency",
      email: `integrity-${concurrentSuffix.toLowerCase()}@example.com`,
      mobile: "+2348000000001",
      jobTitle: "Test",
      companyName: "AIAIAC",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Controlled simultaneous-success reproduction",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    concurrentRegistrationId = concurrentRegistration.id;
    await pool.query(
      `UPDATE delegate_registrations SET email_verification_status='VERIFIED',
       email_verified_at=current_timestamp WHERE id=$1`,
      [concurrentRegistrationId],
    );
    const concurrentA = await service.initialize(concurrentReference, "NGN");
    provider.statuses.set(concurrentA.paymentReference, "failed");
    assert.equal(
      (await service.verify(concurrentA.paymentReference)).status,
      "FAILED",
    );
    const concurrentB = await service.initialize(concurrentReference, "NGN");
    provider.statuses.set(concurrentA.paymentReference, "success");
    provider.statuses.set(concurrentB.paymentReference, "success");
    const simultaneous = await Promise.all([
      service.verify(concurrentA.paymentReference),
      service.verify(concurrentB.paymentReference),
    ]);
    assert.deepEqual(simultaneous.map((payment) => payment.status).sort(), [
      "DUPLICATE_SUCCESS",
      "PAID",
    ]);
    const concurrentObserved = await pool.query<{
      authoritative_count: string;
      registration_link_count: string;
    }>(
      `SELECT
         count(*) FILTER (WHERE pt.financial_authority='AUTHORITATIVE')::text AS authoritative_count,
         count(*) FILTER (WHERE dr.authoritative_payment_transaction_id=pt.id)::text AS registration_link_count
       FROM delegate_registrations dr
       JOIN payment_transactions pt ON pt.registration_id=dr.id
       WHERE dr.id=$1`,
      [concurrentRegistrationId],
    );
    assert.equal(concurrentObserved.rows[0]?.authoritative_count, "1");
    assert.equal(concurrentObserved.rows[0]?.registration_link_count, "1");

    const reconciliationSuffix = randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();
    const reconciliationReference = `AIAIAC-DEL-${reconciliationSuffix}`;
    const reconciliationRegistration = await new DelegateService(
      postgresDelegateRepository,
      () => reconciliationReference,
    ).createRegistration({
      packageId: packageResult.rows[0].id,
      firstName: "Integrity",
      lastName: "Reconciliation",
      email: `integrity-${reconciliationSuffix.toLowerCase()}@example.com`,
      mobile: "+2348000000002",
      jobTitle: "Test",
      companyName: "AIAIAC",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Controlled server reconciliation",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    reconciliationRegistrationId = reconciliationRegistration.id;
    await pool.query(
      `UPDATE delegate_registrations SET email_verification_status='VERIFIED',
       email_verified_at=current_timestamp WHERE id=$1`,
      [reconciliationRegistrationId],
    );
    const unresolved = await service.initialize(reconciliationReference, "NGN");
    provider.statuses.set(unresolved.paymentReference, "success");
    await pool.query(
      "UPDATE payment_transactions SET created_at='2000-01-01T00:00:00Z' WHERE provider_reference=$1",
      [unresolved.paymentReference],
    );
    const reconciliation = await service.reconcile(1);
    assert.deepEqual(reconciliation, {
      examined: 1,
      authoritative: 1,
      duplicateSuccess: 0,
      unresolved: 0,
      providerErrors: 0,
    });
    assert.equal(
      (await service.verify(unresolved.paymentReference)).status,
      "PAID",
    );
    const refundPending = await service.processPaystackWebhook({
      event: "refund.pending",
      data: {
        status: "pending",
        transaction_reference: unresolved.paymentReference,
        amount: String(unresolved.amountMinor),
        currency: unresolved.currency,
      },
    });
    assert.equal(refundPending.status, "RECONCILIATION_REQUIRED");
    const refundFailed = await service.processPaystackWebhook({
      event: "refund.failed",
      data: {
        status: "failed",
        transaction_reference: unresolved.paymentReference,
      },
    });
    assert.equal(refundFailed.status, "PAID");
    const refundProcessed = await service.processPaystackWebhook({
      event: "refund.processed",
      data: {
        status: "processed",
        transaction_reference: unresolved.paymentReference,
      },
    });
    assert.equal(refundProcessed.status, "REVERSED");
    const reconciliationState = await pool.query<{
      payment_status: string;
      authoritative_payment_transaction_id: string;
      status: string;
    }>(
      `SELECT dr.payment_status, dr.authoritative_payment_transaction_id, pt.status
       FROM delegate_registrations dr
       JOIN payment_transactions pt ON pt.id=dr.authoritative_payment_transaction_id
       WHERE dr.id=$1`,
      [reconciliationRegistrationId],
    );
    assert.equal(reconciliationState.rows[0]?.payment_status, "PAID");
    assert.equal(reconciliationState.rows[0]?.status, "REVERSED");
    console.log(
      JSON.stringify({
        delayedSuccessQuarantined: true,
        simultaneousSuccessesSerialized: true,
        oneAuthoritativePayment: true,
        boundedReconciliation: true,
        refundStatesPreserved: true,
        passPolicyDeferredOnReversal: true,
        noRealProviderCalls: true,
      }),
    );
  } finally {
    for (const id of [
      registrationId,
      concurrentRegistrationId,
      reconciliationRegistrationId,
    ]) {
      if (!id) continue;
      await pool.query(
        "UPDATE delegate_registrations SET authoritative_payment_transaction_id=NULL WHERE id=$1",
        [id],
      );
      await pool.query(
        "DELETE FROM payment_transactions WHERE registration_id=$1",
        [id],
      );
      await pool.query("DELETE FROM delegate_registrations WHERE id=$1", [id]);
    }
    const cleanup = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM delegate_registrations WHERE email LIKE 'integrity-%@example.com'",
    );
    assert.equal(cleanup.rows[0]?.count, "0");
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
