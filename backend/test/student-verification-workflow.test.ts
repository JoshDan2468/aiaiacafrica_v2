import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createStudentVerificationController } from "../src/controllers/studentVerification.controller";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import {
  StudentRecoveryTokenInvalidError,
  StudentVerificationEvidenceNotReadyError,
  StudentVerificationTransitionConflictError,
  type StudentVerificationWorkflowRepository,
} from "../src/repositories/studentVerificationWorkflow.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createApiRouter } from "../src/routes";
import { createStudentVerificationRouter } from "../src/routes/studentVerification.routes";
import {
  hashStudentContinuationToken,
  StudentEvidenceAuthorizationError,
  type StudentEvidenceService,
} from "../src/services/studentEvidence.service";
import type { StudentVerificationService } from "../src/services/studentVerification.service";
import { StudentVerificationWorkflowService } from "../src/services/studentVerificationWorkflow.service";
import type {
  AuthorizedStudentEvidenceUpload,
  StudentEvidenceMetadata,
} from "../src/types/studentEvidence";
import type {
  StudentNotificationClaim,
  StudentRecoveryRecipient,
  StudentVerificationAction,
  StudentVerificationAdminDetail,
  StudentVerificationHistoryItem,
  StudentVerificationPublicState,
  StudentVerificationStatus,
} from "../src/types/studentVerification";
import type { AdminRole } from "../src/types/admin";

const reference = "AIAIAC-DEL-STUDENT1";
const studentId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-09-21T10:00:00.000Z");

function evidence(
  category: "STUDENT_ID" | "ENROLMENT",
): StudentEvidenceMetadata {
  return {
    evidenceId: category === "STUDENT_ID" ? "student-id" : "enrolment-id",
    evidenceType:
      category === "STUDENT_ID" ? "CURRENT_STUDENT_ID" : "COURSE_REGISTRATION",
    category,
    displayFilename:
      category === "STUDENT_ID" ? "student-id.png" : "registration.pdf",
    detectedMimeType:
      category === "STUDENT_ID" ? "image/png" : "application/pdf",
    sizeBytes: 1024,
    checksumSha256: "a".repeat(64),
    scanStatus: "CLEAN",
    documentStatus: "AVAILABLE",
    uploadedAt: now,
  };
}

interface FakeNotification extends StudentNotificationClaim {
  status: "NOT_QUEUED" | "PENDING" | "SENT" | "FAILED";
  attempts: number;
}

class FakeWorkflowRepository implements StudentVerificationWorkflowRepository {
  status: StudentVerificationStatus = "NOT_SUBMITTED";
  ready = false;
  submittedAt: Date | null = null;
  reviewedAt: Date | null = null;
  reviewNote: string | null = null;
  history: StudentVerificationHistoryItem[] = [];
  notifications: FakeNotification[] = [];
  storedRecoveryHash: string | null = null;
  recoveryExpiresAt: Date | null = null;
  recoveryConsumed = false;
  continuationHash: string | null = null;

  private state(): StudentVerificationPublicState {
    const items = this.ready
      ? [evidence("STUDENT_ID"), evidence("ENROLMENT")]
      : [];
    const editable = ["NOT_SUBMITTED", "MORE_INFORMATION_REQUIRED"].includes(
      this.status,
    );
    return {
      registrationReference: reference,
      verificationStatus: this.status,
      submittedAt: this.submittedAt,
      reviewedAt: this.reviewedAt,
      latestReviewReason: this.reviewNote,
      evidence: items,
      evidenceReadiness: {
        hasAvailableStudentId: this.ready,
        hasAvailableEnrolmentEvidence: this.ready,
        minimumEvidenceReady: this.ready,
      },
      evidenceEditingAllowed: editable,
      submissionAllowed: editable && this.ready,
      paymentAvailable: false,
      emailVerificationStatus: "VERIFIED",
    };
  }

  async getPublicState(id: string) {
    return id === studentId ? this.state() : null;
  }

  async getAdminDetail(
    registrationReference: string,
  ): Promise<StudentVerificationAdminDetail | null> {
    if (registrationReference !== reference) return null;
    return {
      ...this.state(),
      delegateName: "Ada Okafor",
      email: "ada@example.edu",
      institutionName: "University of Lagos",
      institutionCountry: "Nigeria",
      programmeOfStudy: "Mechanical Engineering",
      studentIdentificationNumber: "UL-2025-1234",
      expectedGraduationYear: 2028,
      institutionalEmail: "ada@unilag.edu.ng",
      createdAt: now,
      history: this.history,
    };
  }

  async submit(id: string, at: Date) {
    if (id !== studentId) throw new Error("not found");
    if (!["NOT_SUBMITTED", "MORE_INFORMATION_REQUIRED"].includes(this.status)) {
      throw new StudentVerificationTransitionConflictError();
    }
    if (!this.ready) throw new StudentVerificationEvidenceNotReadyError();
    const fromStatus = this.status;
    const action: StudentVerificationAction =
      fromStatus === "NOT_SUBMITTED" ? "SUBMITTED" : "RESUBMITTED";
    this.status = "PENDING";
    this.submittedAt = at;
    this.reviewedAt = null;
    this.reviewNote = null;
    this.addHistory(action, fromStatus, "PENDING", null, at);
    return {
      registrationReference: reference,
      verificationStatus: this.status,
    };
  }

  async review(
    registrationReference: string,
    action: "MORE_INFORMATION_REQUIRED" | "APPROVED" | "REJECTED",
    _adminId: string,
    note: string | null,
    at: Date,
  ) {
    if (registrationReference !== reference) throw new Error("not found");
    if (this.status !== "PENDING")
      throw new StudentVerificationTransitionConflictError();
    if (action === "APPROVED" && !this.ready) {
      throw new StudentVerificationEvidenceNotReadyError();
    }
    this.status = action;
    this.reviewedAt = at;
    this.reviewNote = note;
    this.addHistory(action, "PENDING", action, note, at, "Review Admin");
    return {
      registrationReference: reference,
      verificationStatus: this.status,
    };
  }

  async createRecovery(
    registrationReference: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
    _at: Date,
  ): Promise<StudentRecoveryRecipient | null> {
    if (registrationReference !== reference || email !== "ada@example.edu")
      return null;
    this.storedRecoveryHash = tokenHash;
    this.recoveryExpiresAt = expiresAt;
    this.recoveryConsumed = false;
    return { registrationReference: reference, email, fullName: "Ada Okafor" };
  }

  async exchangeRecovery(
    tokenHash: string,
    continuationTokenHash: string,
    _continuationExpiresAt: Date,
    at: Date,
  ) {
    if (
      tokenHash !== this.storedRecoveryHash ||
      this.recoveryConsumed ||
      !this.recoveryExpiresAt ||
      this.recoveryExpiresAt <= at
    ) {
      throw new StudentRecoveryTokenInvalidError();
    }
    this.recoveryConsumed = true;
    this.continuationHash = continuationTokenHash;
    return {
      registrationReference: reference,
      email: "ada@example.edu",
      fullName: "Ada Okafor",
    };
  }

  async claimNotifications(
    registrationReference: string,
  ): Promise<StudentNotificationClaim[]> {
    return this.notifications
      .filter(
        (item) =>
          item.registrationReference === registrationReference &&
          item.status !== "SENT" &&
          item.attempts < 3,
      )
      .map((item) => {
        item.status = "PENDING";
        item.attempts += 1;
        return item;
      });
  }

  async recordNotificationResult(notificationId: string, sent: boolean) {
    const notification = this.notifications.find(
      (item) => item.id === notificationId,
    );
    if (notification?.status === "PENDING")
      notification.status = sent ? "SENT" : "FAILED";
  }

  private addHistory(
    action: StudentVerificationAction,
    fromStatus: StudentVerificationStatus,
    toStatus: StudentVerificationStatus,
    note: string | null,
    createdAt: Date,
    reviewerName: string | null = null,
  ) {
    const id = `history-${this.history.length + 1}`;
    this.history.push({
      id,
      action,
      fromStatus,
      toStatus,
      reviewerName,
      note,
      createdAt,
    });
    this.notifications.push({
      id: `notification-${this.notifications.length + 1}`,
      verificationId: studentId,
      notificationType: action,
      registrationReference: reference,
      email: "ada@example.edu",
      fullName: "Ada Okafor",
      note,
      status: "NOT_QUEUED",
      attempts: 0,
    });
  }
}

class RecordingEmailProvider implements EmailProvider {
  readonly messages: TransactionalEmail[] = [];
  fail = false;

  async send(message: TransactionalEmail) {
    if (this.fail) throw new Error("mail unavailable");
    this.messages.push(message);
  }
}

function workflowFixture(
  options: { provider?: RecordingEmailProvider; clock?: () => Date } = {},
) {
  const repository = new FakeWorkflowRepository();
  const provider = options.provider ?? new RecordingEmailProvider();
  const emailService = new EmailService(
    provider,
    "https://admin.example",
    "https://aiaiac.example",
  );
  const service = new StudentVerificationWorkflowService(
    repository,
    emailService,
    24,
    30,
    options.clock ?? (() => now),
    () => "R".repeat(43),
    () => "C".repeat(43),
  );
  return { repository, provider, service };
}

const authorization: AuthorizedStudentEvidenceUpload = {
  studentVerificationId: studentId,
  registrationReference: reference,
  verificationStatus: "NOT_SUBMITTED",
};

test("workflow migration creates immutable history, hashed recovery, and bounded notification state", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "migrations/20260921010000000_student-verification-workflow.ts",
    ),
    "utf8",
  );
  assert.match(source, /student_verification_history/);
  assert.match(source, /student_verification_recovery_tokens/);
  assert.match(source, /token_hash/);
  assert.match(source, /student_verification_notifications/);
  assert.match(source, /attempts BETWEEN 0 AND 3/);
  assert.doesNotMatch(source, /raw_token|storage_key|filesystem/i);
  const constraintSource = readFileSync(
    join(
      process.cwd(),
      "migrations/20260922010000000_student-verification-reason-constraint.ts",
    ),
    "utf8",
  );
  assert.match(constraintSource, /note IS NOT NULL/);
});

test("submission requires readiness and duplicate submission safely conflicts without duplicate history", async () => {
  const { repository, service } = workflowFixture();
  await assert.rejects(
    () => service.submit(authorization),
    StudentVerificationEvidenceNotReadyError,
  );
  repository.ready = true;
  const result = await service.submit(authorization);
  assert.equal(result.verificationStatus, "PENDING");
  assert.equal(repository.history.length, 1);
  assert.equal(repository.history[0]?.action, "SUBMITTED");
  await assert.rejects(
    () => service.submit(authorization),
    StudentVerificationTransitionConflictError,
  );
  assert.equal(repository.history.length, 1);
});

test("review cycle preserves history and enforces authoritative readiness", async () => {
  const { repository, service } = workflowFixture();
  repository.ready = true;
  await service.submit(authorization);
  repository.ready = false;
  await assert.rejects(
    () => service.review(reference, "APPROVED", "admin-1", null),
    StudentVerificationEvidenceNotReadyError,
  );
  repository.ready = true;
  await service.review(
    reference,
    "MORE_INFORMATION_REQUIRED",
    "admin-1",
    "Please upload a clearer current Student ID.",
  );
  assert.equal(repository.status, "MORE_INFORMATION_REQUIRED");
  repository.ready = false;
  await assert.rejects(
    () =>
      service.submit({
        ...authorization,
        verificationStatus: "MORE_INFORMATION_REQUIRED",
      }),
    StudentVerificationEvidenceNotReadyError,
  );
  repository.ready = true;
  await service.submit({
    ...authorization,
    verificationStatus: "MORE_INFORMATION_REQUIRED",
  });
  await service.review(reference, "APPROVED", "admin-1", "Evidence is clear.");
  assert.deepEqual(
    repository.history.map((item) => item.action),
    ["SUBMITTED", "MORE_INFORMATION_REQUIRED", "RESUBMITTED", "APPROVED"],
  );
  assert.equal(repository.status, "APPROVED");
  assert.equal((await service.getAdminDetail(reference))?.history.length, 4);
  await assert.rejects(
    () => service.submit(authorization),
    StudentVerificationTransitionConflictError,
  );
});

test("conflicting concurrent Admin decisions cannot both commit", async () => {
  const { repository, service } = workflowFixture();
  repository.ready = true;
  await service.submit(authorization);
  const results = await Promise.allSettled([
    service.review(reference, "APPROVED", "admin-a", null),
    service.review(
      reference,
      "REJECTED",
      "admin-b",
      "The evidence does not prove current enrolment.",
    ),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1,
  );
  assert.equal(repository.history.length, 2);
});

test("verification messages contain decision reasons and never claim approval enables payment", async () => {
  const { repository, provider, service } = workflowFixture();
  repository.ready = true;
  await service.submit(authorization);
  assert.match(
    provider.messages[0]?.text ?? "",
    /review is pending|under review/i,
  );
  assert.match(provider.messages[0]?.text ?? "", /No payment/i);

  await service.review(
    reference,
    "MORE_INFORMATION_REQUIRED",
    "admin-1",
    "Please upload a current registration form.",
  );
  assert.match(
    provider.messages[1]?.text ?? "",
    /Please upload a current registration form/,
  );
  await service.submit({
    ...authorization,
    verificationStatus: "MORE_INFORMATION_REQUIRED",
  });
  await service.review(reference, "APPROVED", "admin-1", null);
  const approval = provider.messages.at(-1)?.text ?? "";
  assert.match(approval, /eligibility has been verified/i);
  assert.match(approval, /active Student Delegate price has been confirmed/i);
  assert.doesNotMatch(approval, /pay now|proceed to payment/i);

  const rejected = workflowFixture();
  rejected.repository.ready = true;
  await rejected.service.submit(authorization);
  await rejected.service.review(
    reference,
    "REJECTED",
    "admin-1",
    "The document does not demonstrate current enrolment.",
  );
  assert.match(
    rejected.provider.messages.at(-1)?.text ?? "",
    /does not demonstrate current enrolment/,
  );
});

test("mail failure cannot roll back a committed decision and retry is bounded and idempotent", async () => {
  const provider = new RecordingEmailProvider();
  provider.fail = true;
  const { repository, service } = workflowFixture({ provider });
  repository.ready = true;
  await service.submit(authorization);
  assert.equal(repository.status, "PENDING");
  assert.equal(repository.notifications[0]?.status, "FAILED");
  await service.retryNotifications(reference);
  await service.retryNotifications(reference);
  await service.retryNotifications(reference);
  assert.equal(repository.notifications[0]?.attempts, 3);
  provider.fail = false;
  assert.equal(await service.retryNotifications(reference), 0);
  assert.equal(provider.messages.length, 0);

  const successful = workflowFixture();
  successful.repository.ready = true;
  await successful.service.submit(authorization);
  assert.equal(await successful.service.retryNotifications(reference), 0);
  assert.equal(successful.provider.messages.length, 1);
});

test("email recovery is generic publicly, hash-only, single use, expiring, and rotates continuation", async () => {
  const { repository, provider, service } = workflowFixture();
  await service.requestRecovery(reference, "wrong@example.edu");
  assert.equal(provider.messages.length, 0);
  await service.requestRecovery(reference, "ada@example.edu");
  assert.equal(provider.messages.length, 1);
  assert.notEqual(repository.storedRecoveryHash, "R".repeat(43));
  assert.equal(
    repository.storedRecoveryHash,
    hashStudentContinuationToken("R".repeat(43)),
  );
  assert.match(provider.messages[0]?.text ?? "", /#recoveryToken=/);
  assert.doesNotMatch(JSON.stringify(repository), /R{43}/);

  const access = await service.exchangeRecovery("R".repeat(43));
  assert.equal(access.registrationReference, reference);
  assert.equal(access.continuationToken, "C".repeat(43));
  assert.equal(
    repository.continuationHash,
    hashStudentContinuationToken("C".repeat(43)),
  );
  await assert.rejects(
    () => service.exchangeRecovery("R".repeat(43)),
    StudentRecoveryTokenInvalidError,
  );
  await assert.rejects(
    () => service.exchangeRecovery("X".repeat(43)),
    StudentRecoveryTokenInvalidError,
  );

  const expired = workflowFixture({
    clock: () => new Date("2026-09-21T11:00:00.000Z"),
  });
  expired.repository.storedRecoveryHash = hashStudentContinuationToken(
    "R".repeat(43),
  );
  expired.repository.recoveryExpiresAt = new Date("2026-09-21T10:30:00.000Z");
  await assert.rejects(
    () => expired.service.exchangeRecovery("R".repeat(43)),
    StudentRecoveryTokenInvalidError,
  );
});

function routeFixture() {
  const fixture = workflowFixture();
  fixture.repository.ready = true;
  const evidenceService = {
    authorizeContinuation: async (
      requestedReference: string,
      token: string,
    ) => {
      if (requestedReference !== reference || token !== "T".repeat(43)) {
        throw new StudentEvidenceAuthorizationError();
      }
      return authorization;
    },
  } as unknown as StudentEvidenceService;
  const applicationService = {} as StudentVerificationService;
  const controller = createStudentVerificationController(
    applicationService,
    evidenceService,
    fixture.service,
  );
  const requireAuth: RequestHandler = (request, response, next) => {
    const role = request.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      response
        .status(401)
        .json({ success: false, message: "Authentication is required" });
      return;
    }
    response.locals.admin = {
      id: "admin-1",
      fullName: "Review Admin",
      email: "admin@example.com",
      role,
    };
    next();
  };
  const mutationSecurity: RequestHandler = (request, response, next) => {
    if (request.header("x-test-csrf") !== "valid") {
      response.status(403).json({ success: false, message: "CSRF rejected" });
      return;
    }
    next();
  };
  const workflowRateLimiter: RequestHandler = (request, response, next) => {
    if (request.header("x-rate-limited") === "yes") {
      response
        .status(429)
        .json({ success: false, message: "Too many requests" });
      return;
    }
    next();
  };
  const app = createApplication({
    apiRouter: createApiRouter({
      studentVerificationRouter: createStudentVerificationRouter({
        controller,
        rateLimiter: (_request, _response, next) => next(),
        workflowRateLimiter,
      }),
      adminRouter: createAdminRouter({
        requireAuth,
        mutationSecurity,
        studentVerificationController: controller,
      }),
    }),
  });
  return { ...fixture, app };
}

test("public submission requires scoped ownership, rejects arbitrary target state, and freezes repeat mutation", async () => {
  const { app, repository } = routeFixture();
  await request(app)
    .post(`/api/student-delegate-applications/${reference}/verification/submit`)
    .send({})
    .expect(401);
  await request(app)
    .post(`/api/student-delegate-applications/${reference}/verification/submit`)
    .set("x-aiaiac-continuation-token", "X".repeat(43))
    .send({})
    .expect(401);
  await request(app)
    .post(`/api/student-delegate-applications/${reference}/verification/submit`)
    .set("x-aiaiac-continuation-token", "T".repeat(43))
    .send({ status: "APPROVED" })
    .expect(400);
  await request(app)
    .post(`/api/student-delegate-applications/${reference}/verification/submit`)
    .set("x-aiaiac-continuation-token", "T".repeat(43))
    .send({})
    .expect(200);
  assert.equal(repository.status, "PENDING");
  await request(app)
    .post(`/api/student-delegate-applications/${reference}/verification/submit`)
    .set("x-aiaiac-continuation-token", "T".repeat(43))
    .send({})
    .expect(409);
});

test("Admin detail and review enforce RBAC, mutation security, reasons, and pending-only decisions", async () => {
  const { app, repository } = routeFixture();
  repository.status = "PENDING";
  await request(app)
    .get(`/api/admin/student-verifications/${reference}`)
    .expect(401);
  await request(app)
    .get(`/api/admin/student-verifications/${reference}`)
    .set("x-test-role", "REGISTRATION_MANAGER")
    .expect(200);
  for (const role of ["ADMIN", "FINANCE", "COMMUNICATIONS"] as const) {
    await request(app)
      .post(`/api/admin/student-verifications/${reference}/approve`)
      .set("x-test-role", role)
      .set("x-test-csrf", "valid")
      .send({})
      .expect(403);
  }
  await request(app)
    .post(`/api/admin/student-verifications/${reference}/reject`)
    .set("x-test-role", "REGISTRATION_MANAGER")
    .set("x-test-csrf", "valid")
    .send({ reason: "" })
    .expect(400);
  await request(app)
    .post(
      `/api/admin/student-verifications/${reference}/request-more-information`,
    )
    .set("x-test-role", "SUPER_ADMIN")
    .set("x-test-csrf", "valid")
    .send({ reason: "short" })
    .expect(400);
  await request(app)
    .post(`/api/admin/student-verifications/${reference}/approve`)
    .set("x-test-role", "SUPER_ADMIN")
    .send({})
    .expect(403);
  await request(app)
    .post(`/api/admin/student-verifications/${reference}/approve`)
    .set("x-test-role", "SUPER_ADMIN")
    .set("x-test-csrf", "valid")
    .send({ note: "Evidence reviewed." })
    .expect(200);
  assert.equal(repository.status, "APPROVED");
  await request(app)
    .post(`/api/admin/student-verifications/${reference}/reject`)
    .set("x-test-role", "SUPER_ADMIN")
    .set("x-test-csrf", "valid")
    .send({ reason: "A later conflicting decision." })
    .expect(409);
});

test("recovery request is enumeration-resistant and rate limited", async () => {
  const { app, provider } = routeFixture();
  const unknown = await request(app)
    .post("/api/student-verification-recovery/request")
    .send({
      registrationReference: "AIAIAC-DEL-UNKNOWN1",
      email: "nobody@example.com",
    })
    .expect(202);
  const known = await request(app)
    .post("/api/student-verification-recovery/request")
    .send({ registrationReference: reference, email: "ada@example.edu" })
    .expect(202);
  assert.equal(unknown.body.message, known.body.message);
  assert.equal(provider.messages.length, 1);
  await request(app)
    .post("/api/student-verification-recovery/request")
    .set("x-rate-limited", "yes")
    .send({ registrationReference: reference, email: "ada@example.edu" })
    .expect(429);
});

test("repository uses row locks for submissions, recovery exchange, and conflicting Admin decisions", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "src/repositories/studentVerificationWorkflow.repository.ts",
    ),
    "utf8",
  );
  assert.match(source, /FOR UPDATE OF sv/);
  assert.match(source, /FOR UPDATE OF svrt, sv/);
  assert.match(source, /verification\.status !== "PENDING"/);
  assert.match(source, /ON CONFLICT \(history_id\) DO NOTHING/);
  const evidenceSource = readFileSync(
    join(process.cwd(), "src/repositories/studentEvidence.repository.ts"),
    "utf8",
  );
  assert.match(
    evidenceSource,
    /\["NOT_SUBMITTED", "MORE_INFORMATION_REQUIRED"\]\.includes/,
  );
});
