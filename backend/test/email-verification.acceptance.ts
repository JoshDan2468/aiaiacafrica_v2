/** Local-only P0.7 acceptance. Uses synthetic records and never calls Paystack or Mailjet. */
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
import { postgresDelegateRepository } from "../src/repositories/delegate.repository";
import { postgresEmailVerificationRepository } from "../src/repositories/emailVerification.repository";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { postgresStudentVerificationRepository } from "../src/repositories/studentVerification.repository";
import { DelegateService } from "../src/services/delegate.service";
import {
  DelegatePaymentService,
  PaymentRegistrationIneligibleError,
} from "../src/services/delegatePayment.service";
import { EmailVerificationService } from "../src/services/emailVerification.service";
import { StudentVerificationService } from "../src/services/studentVerification.service";

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

function tokenFrom(message: TransactionalEmail): string {
  const token = /#token=([A-Za-z0-9_-]{43})/.exec(message.text)?.[1];
  assert.ok(token, "verification token missing from synthetic email");
  return token;
}

function nextIdentity(prefix: string) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return {
    reference: `AIAIAC-DEL-${suffix}`,
    email: `${prefix}-${suffix.toLowerCase()}@example.test`,
  };
}

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

  const messages: TransactionalEmail[] = [];
  const emailService = new EmailService(
    { async send(message) { messages.push(message); } },
    "http://localhost:5173",
  );
  const verification = new EmailVerificationService(
    postgresEmailVerificationRepository,
    emailService,
  );
  const provider = new StubProvider();
  const payment = new DelegatePaymentService(
    postgresPaymentRepository,
    new PaymentService(provider),
    { async process() {} },
    "http://localhost:5173/registration/payment/callback",
  );
  const registrationIds: string[] = [];
  const priceIds: string[] = [];

  try {
    const professionalPackage = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_packages WHERE delegate_type='PROFESSIONAL' AND is_active=true LIMIT 1",
    );
    const studentPackage = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_packages WHERE delegate_type='STUDENT' AND is_active=true LIMIT 1",
    );
    assert.ok(professionalPackage.rows[0]);
    assert.ok(studentPackage.rows[0]);

    const createProfessional = async (prefix: string) => {
      const identity = nextIdentity(prefix);
      const created = await new DelegateService(
        postgresDelegateRepository,
        () => identity.reference,
        undefined,
        verification,
      ).createRegistration({
        packageId: professionalPackage.rows[0]!.id,
        firstName: "Synthetic",
        lastName: "Professional",
        email: identity.email,
        mobile: "+2348000000000",
        jobTitle: "Test",
        companyName: "AIAIAC Test",
        country: "Nigeria",
        primaryActivity: "Testing",
        mainObjective: "Verify email ownership acceptance behavior",
        heardAboutSource: "Acceptance test",
        privacyConsent: true,
        dataSharingConsent: false,
      });
      registrationIds.push(created.id);
      return created;
    };

    const messageStart = messages.length;
    const professional = await createProfessional("email-professional");
    assert.equal(professional.emailVerificationStatus, "UNVERIFIED");
    assert.equal(professional.verificationEmailSent, true);
    await assert.rejects(
      () => payment.initialize(professional.reference, "NGN"),
      PaymentRegistrationIneligibleError,
    );
    const professionalToken = tokenFrom(messages[messageStart]!);
    const stored = await pool.query<{ token_hash: string }>(
      "SELECT token_hash FROM delegate_email_verifications WHERE registration_id=$1",
      [professional.id],
    );
    assert.notEqual(stored.rows[0]?.token_hash, professionalToken);
    assert.equal(stored.rows[0]?.token_hash.length, 64);
    assert.equal((await verification.verify(professionalToken)).kind, "VERIFIED");

    const attemptA = await payment.initialize(professional.reference, "NGN");
    provider.statuses.set(attemptA.paymentReference, "failed");
    assert.equal((await payment.verify(attemptA.paymentReference)).status, "FAILED");
    const attemptB = await payment.initialize(professional.reference, "NGN");
    provider.statuses.set(attemptB.paymentReference, "success");
    assert.equal((await payment.verify(attemptB.paymentReference)).status, "PAID");
    provider.statuses.set(attemptA.paymentReference, "success");
    assert.equal(
      (await payment.verify(attemptA.paymentReference)).status,
      "DUPLICATE_SUCCESS",
    );
    const authority = await pool.query<{ paid_count: string; revenue: string }>(
      `SELECT count(*) FILTER (WHERE status='PAID')::text AS paid_count,
              COALESCE(sum(amount_minor) FILTER (WHERE status='PAID'),0)::text AS revenue
       FROM payment_transactions WHERE registration_id=$1`,
      [professional.id],
    );
    assert.equal(authority.rows[0]?.paid_count, "1");
    assert.equal(Number(authority.rows[0]?.revenue), attemptB.amountMinor);
    assert.equal((await verification.verify(professionalToken)).kind, "USED");
    assert.equal((await verification.verify("Z".repeat(43))).kind, "INVALID");

    const resendStart = messages.length;
    const resendRegistration = await createProfessional("email-resend");
    const oldToken = tokenFrom(messages[resendStart]!);
    await verification.resend(
      resendRegistration.reference,
      resendRegistration.email,
    );
    const newToken = tokenFrom(messages.at(-1)!);
    assert.notEqual(newToken, oldToken);
    assert.equal((await verification.verify(oldToken)).kind, "INVALID");
    assert.equal((await verification.verify(newToken)).kind, "VERIFIED");
    const afterVerifiedMessageCount = messages.length;
    await verification.resend(
      resendRegistration.reference,
      resendRegistration.email,
    );
    assert.equal(messages.length, afterVerifiedMessageCount);

    const expiredStart = messages.length;
    const expiredRegistration = await createProfessional("email-expired");
    const expiredToken = tokenFrom(messages[expiredStart]!);
    const futureVerification = new EmailVerificationService(
      postgresEmailVerificationRepository,
      emailService,
      24,
      () => new Date(Date.now() + 25 * 60 * 60 * 1_000),
    );
    assert.equal((await futureVerification.verify(expiredToken)).kind, "EXPIRED");
    assert.equal(
      (await postgresDelegateRepository.findRegistrationById(expiredRegistration.id))
        ?.emailVerificationStatus,
      "UNVERIFIED",
    );

    const failedIdentity = nextIdentity("email-failure");
    const failingVerification = new EmailVerificationService(
      postgresEmailVerificationRepository,
      { async sendEmailVerification() { throw new Error("Synthetic delivery failure"); } },
    );
    const failedDelivery = await new DelegateService(
      postgresDelegateRepository,
      () => failedIdentity.reference,
      undefined,
      failingVerification,
    ).createRegistration({
      packageId: professionalPackage.rows[0]!.id,
      firstName: "Failed",
      lastName: "Delivery",
      email: failedIdentity.email,
      mobile: "+2348000000000",
      jobTitle: "Test",
      companyName: "AIAIAC Test",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Verify safe email delivery failure handling",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    registrationIds.push(failedDelivery.id);
    assert.equal(failedDelivery.verificationEmailSent, false);
    assert.equal(failedDelivery.emailVerificationStatus, "UNVERIFIED");

    const studentPriceId = randomUUID();
    priceIds.push(studentPriceId);
    await pool.query(
      `INSERT INTO delegate_package_prices (
         id, package_id, currency, amount_minor, is_active
       ) VALUES ($1, $2, 'NGN', 35000000, true)`,
      [studentPriceId, studentPackage.rows[0]!.id],
    );
    const studentIdentity = nextIdentity("email-student");
    const studentStart = messages.length;
    const student = await new StudentVerificationService(
      postgresStudentVerificationRepository,
      () => studentIdentity.reference,
      24,
      undefined,
      undefined,
      verification,
    ).createApplication({
      packageId: studentPackage.rows[0]!.id,
      firstName: "Synthetic",
      lastName: "Student",
      email: studentIdentity.email,
      mobile: "+2348000000000",
      country: "Nigeria",
      mainObjective: "Verify Student email ownership acceptance behavior",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
      institutionName: "Synthetic University",
      institutionCountry: "Nigeria",
      programmeOfStudy: "Engineering",
      studentIdentificationNumber: `TEST-${studentIdentity.reference}`,
      expectedGraduationYear: 2028,
      institutionalEmail: studentIdentity.email,
    });
    const studentRow = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_registrations WHERE reference=$1",
      [student.reference],
    );
    const studentRegistrationId = studentRow.rows[0]?.id;
    assert.ok(studentRegistrationId);
    registrationIds.push(studentRegistrationId);
    assert.equal(student.emailVerificationStatus, "UNVERIFIED");
    const studentToken = tokenFrom(messages[studentStart]!);
    assert.equal((await verification.verify(studentToken)).kind, "VERIFIED");
    await assert.rejects(
      () => payment.initialize(student.reference, "NGN"),
      PaymentRegistrationIneligibleError,
    );
    const reviewer = await pool.query<{ id: string }>(
      "SELECT id FROM admins WHERE is_active=true ORDER BY created_at LIMIT 1",
    );
    assert.ok(reviewer.rows[0], "An active synthetic review actor is required");
    await pool.query(
      `UPDATE student_verifications
       SET status='APPROVED', submitted_at=current_timestamp,
           reviewed_at=current_timestamp, reviewed_by_admin_id=$2
       WHERE registration_id=$1`,
      [studentRegistrationId, reviewer.rows[0].id],
    );
    const studentPayment = await payment.initialize(student.reference, "NGN");
    assert.equal(studentPayment.amountMinor, 35000000);
    await assert.rejects(
      () =>
        new DelegateService(
          postgresDelegateRepository,
          () => nextIdentity("email-duplicate").reference,
        ).createRegistration({
          packageId: professionalPackage.rows[0]!.id,
          firstName: "Duplicate",
          lastName: "Professional",
          email: professional.email,
          mobile: "+2348000000000",
          jobTitle: "Test",
          companyName: "AIAIAC Test",
          country: "Nigeria",
          primaryActivity: "Testing",
          mainObjective: "Verify duplicate registration behavior remains correct",
          heardAboutSource: "Acceptance test",
          privacyConsent: true,
          dataSharingConsent: false,
        }),
      /already exists/i,
    );

    const audit = await pool.query<{ event_type: string; details: object }>(
      `SELECT event_type, details
       FROM delegate_email_verification_events
       WHERE registration_id = ANY($1::uuid[]) OR registration_id IS NULL`,
      [registrationIds],
    );
    assert.ok(audit.rows.some((row) => row.event_type === "EMAIL_VERIFICATION_COMPLETED"));
    assert.ok(audit.rows.some((row) => row.event_type === "EMAIL_VERIFICATION_EXPIRED_ATTEMPT"));
    assert.ok(audit.rows.some((row) => row.event_type === "EMAIL_VERIFICATION_DELIVERY_FAILED"));
    assert.ok(!JSON.stringify(audit.rows).includes(professionalToken));

    console.log(
      JSON.stringify({
        professional: "VERIFIED",
        student: "VERIFIED_AND_PAYMENT_GATED",
        resend: "ROTATED",
        duplicateSuccess: "PRESERVED",
        authoritativePaidCount: authority.rows[0]?.paid_count,
      }),
    );
  } finally {
    if (registrationIds.length) {
      const cleanupClient = await pool.connect();
      try {
        await cleanupClient.query("BEGIN");
        await cleanupClient.query(
          `UPDATE delegate_registrations
           SET authoritative_payment_transaction_id = NULL
           WHERE id = ANY($1::uuid[])`,
          [registrationIds],
        );
        await cleanupClient.query(
          "DELETE FROM delegate_event_passes WHERE registration_id = ANY($1::uuid[])",
          [registrationIds],
        );
        await cleanupClient.query(
          "DELETE FROM payment_transactions WHERE registration_id = ANY($1::uuid[])",
          [registrationIds],
        );
        await cleanupClient.query(
          "DELETE FROM delegate_registrations WHERE id = ANY($1::uuid[])",
          [registrationIds],
        );
        await cleanupClient.query("COMMIT");
      } catch (error) {
        await cleanupClient.query("ROLLBACK");
        throw error;
      } finally {
        cleanupClient.release();
      }
    }
    if (priceIds.length) {
      await pool.query("DELETE FROM delegate_package_prices WHERE id = ANY($1::uuid[])", [
        priceIds,
      ]).catch(() => undefined);
    }
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
