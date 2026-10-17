/** Local-only P0.8 acceptance. Uses synthetic rows and never calls Paystack or Mailjet. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
import { postgresDelegateRepository } from "../src/repositories/delegate.repository";
import { postgresManualPaymentRepository } from "../src/repositories/manualPayment.repository";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { postgresPaymentCompletionRepository } from "../src/repositories/paymentCompletion.repository";
import { postgresReportRepository } from "../src/repositories/report.repository";
import { AdminOverviewService } from "../src/services/adminOverview.service";
import { DelegateService } from "../src/services/delegate.service";
import {
  DelegatePaymentService,
  PaymentAlreadyPaidError,
} from "../src/services/delegatePayment.service";
import {
  ManualPaymentAmountMismatchError,
  ManualPaymentConflictError,
  ManualPaymentIneligibleError,
  ManualPaymentService,
} from "../src/services/manualPayment.service";
import { PaymentCompletionService } from "../src/services/paymentCompletion.service";

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
      providerTransactionId: randomUUID().replaceAll("-", "").slice(0, 24),
      channel: "synthetic",
      gatewayResponse: "Synthetic provider",
      paidAt: new Date(),
      customerEmail: input.email,
    };
  }
}

function identity(prefix: string) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return {
    reference: `AIAIAC-DEL-${suffix}`,
    email: `${prefix.toLowerCase()}-${suffix.toLowerCase()}@example.test`,
  };
}

async function main() {
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

  const registrationIds: string[] = [];
  const adminIds = [randomUUID(), randomUUID()];
  const priceIds: string[] = [];
  let studentPackageIdToRestore: string | null = null;
  const emails: TransactionalEmail[] = [];
  const provider = new StubProvider();
  const completion = new PaymentCompletionService(
    postgresPaymentCompletionRepository,
    new EmailService(
      {
        async send(message) {
          emails.push(message);
        },
      },
      "http://localhost:5173",
    ),
    [],
  );
  const manual = new ManualPaymentService(
    postgresManualPaymentRepository,
    postgresPaymentRepository,
    completion,
  );
  const paystack = new DelegatePaymentService(
    postgresPaymentRepository,
    new PaymentService(provider),
    completion,
    "http://localhost:5173/registration/payment/callback",
  );

  try {
    for (const [index, adminId] of adminIds.entries()) {
      await pool.query(
        `INSERT INTO admins (id, full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'synthetic-not-a-login-hash', 'FINANCE')`,
        [
          adminId,
          `P0.8 Finance ${index + 1}`,
          `p08-finance-${adminId}@example.test`,
        ],
      );
    }

    const professionalPackage = await pool.query<{
      id: string;
      currency: "USD" | "NGN";
    }>(
      `SELECT id, currency FROM delegate_packages
       WHERE delegate_type='PROFESSIONAL' AND is_active=true LIMIT 1`,
    );
    const studentPackage = await pool.query<{
      id: string;
      currency: "USD" | "NGN";
    }>(
      `SELECT id, currency FROM delegate_packages
       WHERE delegate_type='STUDENT' AND is_active=true LIMIT 1`,
    );
    assert.ok(professionalPackage.rows[0]);
    assert.ok(studentPackage.rows[0]);
    if (!studentPackage.rows[0].currency) {
      studentPackageIdToRestore = studentPackage.rows[0].id;
      await pool.query(
        "UPDATE delegate_packages SET currency='NGN' WHERE id=$1",
        [studentPackageIdToRestore],
      );
    }

    const ensurePrice = async (packageId: string, currency: "USD" | "NGN") => {
      const current = await pool.query<{ id: string; amount_minor: number }>(
        `SELECT id, amount_minor FROM delegate_package_prices
         WHERE package_id=$1 AND currency=$2 AND is_active=true`,
        [packageId, currency],
      );
      if (current.rows[0]) return current.rows[0].amount_minor;
      const id = randomUUID();
      priceIds.push(id);
      await pool.query(
        `INSERT INTO delegate_package_prices
           (id, package_id, currency, amount_minor, is_active)
         VALUES ($1, $2, $3, 210000000, true)`,
        [id, packageId, currency],
      );
      return 210000000;
    };

    const professionalCurrency = professionalPackage.rows[0].currency ?? "NGN";
    const studentCurrency = studentPackage.rows[0].currency ?? "NGN";
    const professionalAmount = await ensurePrice(
      professionalPackage.rows[0].id,
      professionalCurrency,
    );
    const studentAmount = await ensurePrice(
      studentPackage.rows[0].id,
      studentCurrency,
    );

    const createRegistration = async (
      prefix: string,
      packageId: string,
      verified: boolean,
    ) => {
      const next = identity(prefix);
      const created = await new DelegateService(
        postgresDelegateRepository,
        () => next.reference,
      ).createRegistration({
        packageId,
        firstName: "Synthetic",
        lastName: prefix,
        email: next.email,
        mobile: "+2348000000000",
        jobTitle: "Test",
        companyName: "AIAIAC Test",
        country: "Nigeria",
        primaryActivity: "Testing",
        mainObjective: "Manual payment acceptance",
        heardAboutSource: "Acceptance test",
        privacyConsent: true,
        dataSharingConsent: false,
      });
      registrationIds.push(created.id);
      if (verified) {
        await pool.query(
          `UPDATE delegate_registrations
           SET email_verification_status='VERIFIED', email_verified_at=current_timestamp
           WHERE id=$1`,
          [created.id],
        );
      }
      return created;
    };

    const manualInput = (
      registrationReference: string,
      currency: "USD" | "NGN",
      amountMinor: number,
      suffix: string,
      adminId = adminIds[0]!,
    ) => ({
      registrationReference,
      method: "BANK_TRANSFER" as const,
      currency,
      amountMinor,
      externalReference: `SYNTHETIC-P08-${suffix}-${randomUUID()}`,
      paymentDate: new Date(Date.now() - 60_000),
      payerName: "Synthetic Payer",
      internalNote: "Synthetic acceptance evidence only",
      adminId,
    });

    const unverified = await createRegistration(
      "Unverified",
      professionalPackage.rows[0].id,
      false,
    );
    await assert.rejects(
      () =>
        manual.record(
          manualInput(
            unverified.reference,
            professionalCurrency,
            professionalAmount,
            "UNVERIFIED",
          ),
        ),
      (error) =>
        error instanceof ManualPaymentIneligibleError &&
        error.reason === "EMAIL_UNVERIFIED",
    );

    const professional = await createRegistration(
      "Professional",
      professionalPackage.rows[0].id,
      true,
    );
    const eligibility = await manual.inspectEligibility(
      professional.reference,
      professionalCurrency,
    );
    assert.equal(eligibility.eligible, true);
    await assert.rejects(
      () =>
        manual.record(
          manualInput(
            professional.reference,
            professionalCurrency,
            professionalAmount + 1,
            "WRONG-AMOUNT",
          ),
        ),
      ManualPaymentAmountMismatchError,
    );

    const student = await createRegistration(
      "Student",
      studentPackage.rows[0].id,
      true,
    );
    const verificationId = randomUUID();
    await pool.query(
      `INSERT INTO student_verifications (
         id, registration_id, institution_name, institution_country,
         programme_of_study, student_identification_number,
         expected_graduation_year, status, submitted_at
       ) VALUES ($1,$2,'Synthetic University','Nigeria','Engineering','P08-STUDENT',
                 2028,'PENDING',current_timestamp)`,
      [verificationId, student.id],
    );
    await assert.rejects(
      () =>
        manual.record(
          manualInput(
            student.reference,
            studentCurrency,
            studentAmount,
            "STUDENT-PENDING",
          ),
        ),
      (error) =>
        error instanceof ManualPaymentIneligibleError &&
        error.reason === "STUDENT_NOT_APPROVED",
    );
    await pool.query(
      `UPDATE student_verifications
       SET status='APPROVED', reviewed_at=current_timestamp,
           reviewed_by_admin_id=$2, updated_at=current_timestamp
       WHERE id=$1`,
      [verificationId, adminIds[0]],
    );
    const wrongCurrency = studentCurrency === "NGN" ? "USD" : "NGN";
    const wrongCurrencyEligibility = await manual.inspectEligibility(
      student.reference,
      wrongCurrency,
    );
    assert.equal(wrongCurrencyEligibility.eligible, false);
    assert.equal(wrongCurrencyEligibility.reason, "PRICE_UNAVAILABLE");
    assert.equal(
      (await manual.inspectEligibility(student.reference, studentCurrency))
        .eligible,
      true,
    );

    const recorded = await manual.record(
      manualInput(
        professional.reference,
        professionalCurrency,
        professionalAmount,
        "PROFESSIONAL",
      ),
    );
    assert.equal(recorded.status, "PENDING_CONFIRMATION");
    assert.equal(recorded.paymentSource, "MANUAL");
    assert.equal(recorded.paymentMethod, "BANK_TRANSFER");
    assert.equal(recorded.financialAuthority, "UNRESOLVED");

    const confirmed = await manual.confirm(
      recorded.paymentReference,
      adminIds[1]!,
    );
    assert.equal(confirmed.payment.status, "PAID");
    assert.equal(confirmed.payment.financialAuthority, "AUTHORITATIVE");
    assert.equal(confirmed.alreadyConfirmed, false);
    const repeated = await manual.confirm(
      recorded.paymentReference,
      adminIds[0]!,
    );
    assert.equal(repeated.alreadyConfirmed, true);

    const concurrentRegistration = await createRegistration(
      "Concurrent",
      professionalPackage.rows[0].id,
      true,
    );
    const concurrentRecord = await manual.record(
      manualInput(
        concurrentRegistration.reference,
        professionalCurrency,
        professionalAmount,
        "CONCURRENT",
      ),
    );
    const concurrent = await Promise.all([
      manual.confirm(concurrentRecord.paymentReference, adminIds[0]!),
      manual.confirm(concurrentRecord.paymentReference, adminIds[1]!),
    ]);
    assert.equal(concurrent.filter((item) => !item.alreadyConfirmed).length, 1);

    const paystackPaid = await createRegistration(
      "PaystackFirst",
      professionalPackage.rows[0].id,
      true,
    );
    const paystackFirst = await paystack.initialize(
      paystackPaid.reference,
      professionalCurrency,
    );
    const manualPendingBehindPaystack = await manual.record(
      manualInput(
        paystackPaid.reference,
        professionalCurrency,
        professionalAmount,
        "PAYSTACK-WINS",
      ),
    );
    provider.statuses.set(paystackFirst.paymentReference, "success");
    assert.equal(
      (await paystack.verify(paystackFirst.paymentReference)).status,
      "PAID",
    );
    await assert.rejects(
      () =>
        manual.confirm(
          manualPendingBehindPaystack.paymentReference,
          adminIds[1]!,
        ),
      (error) =>
        error instanceof ManualPaymentConflictError &&
        error.reason === "REGISTRATION_ALREADY_PAID",
    );
    await assert.rejects(
      () =>
        manual.record(
          manualInput(
            paystackPaid.reference,
            professionalCurrency,
            professionalAmount,
            "PAYSTACK-FIRST",
          ),
        ),
      (error) =>
        error instanceof ManualPaymentIneligibleError &&
        error.reason === "ALREADY_PAID",
    );

    const delayed = await createRegistration(
      "ManualFirst",
      professionalPackage.rows[0].id,
      true,
    );
    const delayedPaystack = await paystack.initialize(
      delayed.reference,
      professionalCurrency,
    );
    const delayedManual = await manual.record(
      manualInput(
        delayed.reference,
        professionalCurrency,
        professionalAmount,
        "MANUAL-FIRST",
      ),
    );
    await manual.confirm(delayedManual.paymentReference, adminIds[1]!);
    await assert.rejects(
      () => paystack.initialize(delayed.reference, professionalCurrency),
      PaymentAlreadyPaidError,
    );
    provider.statuses.set(delayedPaystack.paymentReference, "success");
    assert.equal(
      (await paystack.verify(delayedPaystack.paymentReference)).status,
      "DUPLICATE_SUCCESS",
    );

    for (const registrationId of [
      professional.id,
      concurrentRegistration.id,
      delayed.id,
    ]) {
      const integrity: {
        rows: Array<{ authoritative_count: string; pass_count: string }>;
      } = await pool.query<{
        authoritative_count: string;
        pass_count: string;
      }>(
        `SELECT
           (SELECT count(*)::text FROM payment_transactions
             WHERE registration_id=$1 AND financial_authority='AUTHORITATIVE') AS authoritative_count,
           (SELECT count(*)::text FROM delegate_event_passes
             WHERE registration_id=$1) AS pass_count`,
        [registrationId],
      );
      assert.equal(integrity.rows[0]?.authoritative_count, "1");
      assert.equal(integrity.rows[0]?.pass_count, "1");
    }

    const attendeeEmails = emails.filter(
      (email) => email.toEmail === professional.email,
    );
    assert.equal(attendeeEmails.length, 1);
    assert.match(attendeeEmails[0]!.subject, /payment confirmed/i);

    const overview = await new AdminOverviewService(
      postgresAdminOverviewRepository,
    ).getOverview();
    assert.ok(overview.metrics.paidRegistrations >= 4);
    assert.ok(
      overview.metrics.confirmedRevenue[professionalCurrency] >=
        professionalAmount * 4,
    );
    const report = await postgresReportRepository.rows(
      "payments",
      { page: 1, limit: 100, status: "PAID" },
      0,
      100,
    );
    const reportRow = report.find(
      (row) => row.paymentReference === recorded.paymentReference,
    );
    assert.equal(reportRow?.paymentSource, "MANUAL");
    assert.equal(reportRow?.paymentMethod, "BANK_TRANSFER");

    const audit = await pool.query<{ action: string; total: string }>(
      `SELECT action, count(*)::text AS total FROM admin_audit_logs
       WHERE entity_type='PAYMENT_TRANSACTION'
         AND entity_id IN (
           SELECT id FROM payment_transactions WHERE registration_id=ANY($1::uuid[])
         ) GROUP BY action`,
      [registrationIds],
    );
    assert.ok(
      audit.rows.some((row) => row.action === "MANUAL_PAYMENT_RECORDED"),
    );
    assert.ok(
      audit.rows.some((row) => row.action === "MANUAL_PAYMENT_CONFIRMED"),
    );
    assert.ok(
      audit.rows.some(
        (row) => row.action === "MANUAL_PAYMENT_CONFIRMATION_FAILED",
      ),
    );

    const storedPasses = await pool.query<{ credential_hash: string }>(
      `SELECT credential_hash FROM delegate_event_passes
       WHERE registration_id=ANY($1::uuid[])`,
      [registrationIds],
    );
    assert.ok(storedPasses.rows.length >= 3);
    assert.ok(
      storedPasses.rows.every((row) =>
        /^[a-f0-9]{64}$/.test(row.credential_hash),
      ),
    );
    const serializedAdminData = JSON.stringify({
      audit: audit.rows,
      payment: await postgresPaymentRepository.findPaymentDetail(
        recorded.paymentReference,
      ),
    });
    assert.doesNotMatch(serializedAdminData, /AIAIAC-PASS-/);

    const delayedFinancials = await pool.query<{
      authoritative_count: string;
      revenue_minor: string;
      duplicate_count: string;
    }>(
      `SELECT
         count(*) FILTER (WHERE financial_authority='AUTHORITATIVE')::text AS authoritative_count,
         COALESCE(sum(amount_minor) FILTER (WHERE financial_authority='AUTHORITATIVE'),0)::text AS revenue_minor,
         count(*) FILTER (WHERE status='DUPLICATE_SUCCESS')::text AS duplicate_count
       FROM payment_transactions WHERE registration_id=$1`,
      [delayed.id],
    );
    assert.equal(delayedFinancials.rows[0]?.authoritative_count, "1");
    assert.equal(
      Number(delayedFinancials.rows[0]?.revenue_minor),
      professionalAmount,
    );
    assert.equal(delayedFinancials.rows[0]?.duplicate_count, "1");

    console.log(
      JSON.stringify({
        unverifiedDenied: true,
        professionalEligible: true,
        studentUnapprovedDenied: true,
        studentApprovedEligible: true,
        amountAndCurrencyEnforced: true,
        recordedPendingConfirmation: true,
        confirmedAuthoritative: true,
        repeatedConfirmationIdempotent: true,
        concurrentAdminsSerialized: true,
        paystackFirstManualDenied: true,
        paystackFirstPendingManualConfirmationDenied: true,
        manualFirstDelayedPaystackDuplicate: true,
        oneEventPass: true,
        attendeeEmailOnce: true,
        overviewAndReportsCorrect: true,
        auditTrailPresent: true,
        credentialStoredAsHashOnly: true,
        noRealProviderOrEmailCalls: true,
      }),
    );
  } finally {
    if (registrationIds.length) {
      await pool.query(
        `DELETE FROM payment_admin_notifications
         WHERE payment_transaction_id IN (
           SELECT id FROM payment_transactions WHERE registration_id=ANY($1::uuid[])
         )`,
        [registrationIds],
      );
      await pool.query(
        "DELETE FROM delegate_event_passes WHERE registration_id=ANY($1::uuid[])",
        [registrationIds],
      );
      await pool.query(
        `DELETE FROM admin_audit_logs
         WHERE entity_type='PAYMENT_TRANSACTION'
           AND entity_id IN (
             SELECT id FROM payment_transactions WHERE registration_id=ANY($1::uuid[])
           )`,
        [registrationIds],
      );
      await pool.query(
        `UPDATE delegate_registrations SET authoritative_payment_transaction_id=NULL
         WHERE id=ANY($1::uuid[])`,
        [registrationIds],
      );
      await pool.query(
        "DELETE FROM payment_transactions WHERE registration_id=ANY($1::uuid[])",
        [registrationIds],
      );
      await pool.query(
        "DELETE FROM delegate_registrations WHERE id=ANY($1::uuid[])",
        [registrationIds],
      );
    }
    if (priceIds.length) {
      await pool.query(
        "DELETE FROM delegate_package_prices WHERE id=ANY($1::uuid[])",
        [priceIds],
      );
    }
    if (studentPackageIdToRestore) {
      await pool.query(
        "UPDATE delegate_packages SET currency=NULL WHERE id=$1",
        [studentPackageIdToRestore],
      );
    }
    await pool.query("DELETE FROM admins WHERE id=ANY($1::uuid[])", [adminIds]);
    await closeDatabasePool();
  }
}

void main();
