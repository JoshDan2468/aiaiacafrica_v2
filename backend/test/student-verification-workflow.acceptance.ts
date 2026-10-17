import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { PaymentService } from "../src/payments/payment.service";
import type {
  InitializedProviderPayment,
  InitializeProviderPaymentInput,
  PaymentProvider,
  VerifiedProviderPayment,
} from "../src/payments/payment.types";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { postgresStudentEvidenceRepository } from "../src/repositories/studentEvidence.repository";
import { postgresStudentVerificationRepository } from "../src/repositories/studentVerification.repository";
import { postgresStudentVerificationWorkflowRepository } from "../src/repositories/studentVerificationWorkflow.repository";
import {
  DelegatePaymentService,
  PaymentPriceUnavailableError,
} from "../src/services/delegatePayment.service";
import { StudentEvidenceService } from "../src/services/studentEvidence.service";
import { StudentVerificationService } from "../src/services/studentVerification.service";
import { StudentVerificationWorkflowService } from "../src/services/studentVerificationWorkflow.service";
import { LocalStudentEvidenceStorage } from "../src/studentEvidence/local.storage";
import type {
  MalwareScanInput,
  MalwareScanner,
} from "../src/studentEvidence/malwareScanner";

/** Explicit test-only adapter. Production composition cannot import or enable this file. */
class TestOnlyCleanScanner implements MalwareScanner {
  async scan(_input: MalwareScanInput): Promise<"CLEAN"> {
    return "CLEAN";
  }
}

class RecordingEmailProvider implements EmailProvider {
  readonly messages: TransactionalEmail[] = [];

  async send(message: TransactionalEmail): Promise<void> {
    this.messages.push(message);
  }
}

class NeverCalledPaymentProvider implements PaymentProvider {
  initializeCalls = 0;

  async initialize(
    _input: InitializeProviderPaymentInput,
  ): Promise<InitializedProviderPayment> {
    this.initializeCalls += 1;
    throw new Error(
      "Paystack-equivalent provider must not be called for an unpriced Student",
    );
  }

  async verify(_reference: string): Promise<VerifiedProviderPayment> {
    throw new Error("Verification is not part of this acceptance path");
  }
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlY4AAAAASUVORK5CYII=",
  "base64",
);

async function main() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_URL is required for acceptance");
  const packageResult = await pool.query<{ id: string }>(
    `SELECT id FROM delegate_packages
     WHERE delegate_type = 'STUDENT' AND is_active = true LIMIT 1`,
  );
  const adminResult = await pool.query<{ id: string }>(
    `SELECT id FROM admins
     WHERE is_active = true AND role IN ('SUPER_ADMIN', 'REGISTRATION_MANAGER')
     ORDER BY CASE role WHEN 'REGISTRATION_MANAGER' THEN 0 ELSE 1 END LIMIT 1`,
  );
  const packageId = packageResult.rows[0]?.id;
  const adminId = adminResult.rows[0]?.id;
  if (!packageId || !adminId)
    throw new Error("Acceptance needs an active Student package and reviewer");

  const suffix =
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const reference = `AIAIAC-DEL-${suffix.slice(-8)}`;
  const email = `student-acceptance-${suffix.toLowerCase()}@example.test`;
  const storageDirectory = await mkdtemp(join(tmpdir(), "aiaiac-3b3-"));
  const emailProvider = new RecordingEmailProvider();

  try {
    const applicationService = new StudentVerificationService(
      postgresStudentVerificationRepository,
      () => reference,
      24,
      () => new Date(),
      () => "A".repeat(43),
    );
    const application = await applicationService.createApplication({
      packageId,
      firstName: "Acceptance",
      lastName: "Student",
      email,
      mobile: "+2348000000000",
      country: "Nigeria",
      mainObjective: "Controlled Milestone 3B.3 acceptance verification.",
      heardAboutSource: "Automated acceptance",
      privacyConsent: true,
      dataSharingConsent: false,
      institutionName: "Acceptance Test University",
      institutionCountry: "Nigeria",
      programmeOfStudy: "Systems Engineering",
      studentIdentificationNumber: `ACC-${suffix}`,
      expectedGraduationYear: 2028,
      institutionalEmail: email,
    });
    const evidenceService = new StudentEvidenceService(
      postgresStudentEvidenceRepository,
      new LocalStudentEvidenceStorage(storageDirectory),
      new TestOnlyCleanScanner(),
    );
    const authorization = await evidenceService.authorizeContinuation(
      reference,
      application.continuationToken,
    );
    const studentIdUpload = await evidenceService.upload(
      authorization,
      "CURRENT_STUDENT_ID",
      {
        originalname: "student-id.png",
        mimetype: "image/png",
        size: png.length,
        buffer: png,
      },
    );
    await evidenceService.upload(authorization, "COURSE_REGISTRATION", {
      originalname: "course-registration.png",
      mimetype: "image/png",
      size: png.length,
      buffer: png,
    });

    const workflow = new StudentVerificationWorkflowService(
      postgresStudentVerificationWorkflowRepository,
      new EmailService(
        emailProvider,
        "https://admin.example.test",
        "https://example.test",
      ),
    );
    await workflow.submit(authorization);
    assert.equal(
      (await workflow.getAdminDetail(reference))?.verificationStatus,
      "PENDING",
    );
    await workflow.review(
      reference,
      "MORE_INFORMATION_REQUIRED",
      adminId,
      "Please replace the current Student ID with a clearer image.",
    );
    await evidenceService.upload(
      authorization,
      "CURRENT_STUDENT_ID",
      {
        originalname: "student-id-clear.png",
        mimetype: "image/png",
        size: png.length,
        buffer: png,
      },
      studentIdUpload.evidence.evidenceId,
    );
    await workflow.submit(authorization);
    await workflow.review(
      reference,
      "APPROVED",
      adminId,
      "Current evidence reviewed.",
    );

    const detail = await workflow.getAdminDetail(reference);
    assert.equal(detail?.verificationStatus, "APPROVED");
    assert.deepEqual(
      detail?.history.map((item) => item.action),
      ["SUBMITTED", "MORE_INFORMATION_REQUIRED", "RESUBMITTED", "APPROVED"],
    );
    assert.equal(detail?.evidenceReadiness.minimumEvidenceReady, true);

    const eventResult = await pool.query<{ event_type: string }>(
      `SELECT sve.event_type FROM student_verification_events sve
       JOIN student_verifications sv ON sv.id = sve.student_verification_id
       JOIN delegate_registrations dr ON dr.id = sv.registration_id
       WHERE dr.reference = $1
         AND sve.event_type IN (
           'STUDENT_VERIFICATION_SUBMITTED', 'STUDENT_MORE_INFORMATION_REQUIRED',
           'STUDENT_VERIFICATION_RESUBMITTED', 'STUDENT_VERIFICATION_APPROVED'
         )
       ORDER BY sve.created_at, sve.id`,
      [reference],
    );
    assert.deepEqual(
      eventResult.rows.map((row) => row.event_type),
      [
        "STUDENT_VERIFICATION_SUBMITTED",
        "STUDENT_MORE_INFORMATION_REQUIRED",
        "STUDENT_VERIFICATION_RESUBMITTED",
        "STUDENT_VERIFICATION_APPROVED",
      ],
    );
    const notificationResult = await pool.query<{
      status: string;
      attempts: number;
    }>(
      `SELECT svn.status, svn.attempts
       FROM student_verification_notifications svn
       JOIN student_verifications sv ON sv.id = svn.student_verification_id
       JOIN delegate_registrations dr ON dr.id = sv.registration_id
       WHERE dr.reference = $1 ORDER BY svn.created_at, svn.id`,
      [reference],
    );
    assert.equal(notificationResult.rows.length, 4);
    assert.equal(
      notificationResult.rows.every((row) => row.status === "SENT"),
      true,
    );
    assert.equal(
      notificationResult.rows.every((row) => row.attempts === 1),
      true,
    );

    const beforePayments = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM payment_transactions pt
       JOIN delegate_registrations dr ON dr.id = pt.registration_id
       WHERE dr.reference = $1`,
      [reference],
    );
    const paymentProvider = new NeverCalledPaymentProvider();
    const paymentService = new DelegatePaymentService(
      postgresPaymentRepository,
      new PaymentService(paymentProvider),
      { process: async () => undefined },
      "https://example.test/registration/payment/callback",
      () => `AIAIAC-PAY-ACC${suffix}`,
    );
    await assert.rejects(
      () => paymentService.initialize(reference, "NGN"),
      PaymentPriceUnavailableError,
    );
    const afterPayments = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM payment_transactions pt
       JOIN delegate_registrations dr ON dr.id = pt.registration_id
       WHERE dr.reference = $1`,
      [reference],
    );
    assert.equal(beforePayments.rows[0]?.count, "0");
    assert.equal(afterPayments.rows[0]?.count, "0");
    assert.equal(paymentProvider.initializeCalls, 0);
    assert.equal(emailProvider.messages.length, 4);

    console.log(
      JSON.stringify(
        {
          result: "PASS",
          reference,
          finalStatus: detail?.verificationStatus,
          history: detail?.history.map((item) => item.action),
          workflowEvents: eventResult.rows.map((row) => row.event_type),
          notificationEmails: emailProvider.messages.length,
          notificationStates: notificationResult.rows,
          paymentTransactionsBefore: Number(beforePayments.rows[0]?.count ?? 0),
          paymentTransactionsAfter: Number(afterPayments.rows[0]?.count ?? 0),
          paymentProviderCalls: paymentProvider.initializeCalls,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.query(
      "DELETE FROM delegate_registrations WHERE reference = $1",
      [reference],
    );
    if (storageDirectory.startsWith(join(tmpdir(), "aiaiac-3b3-"))) {
      await rm(storageDirectory, { recursive: true, force: true });
    }
    await closeDatabasePool();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Acceptance failed");
  process.exitCode = 1;
});
