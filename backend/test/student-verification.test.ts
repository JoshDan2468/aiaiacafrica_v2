import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createStudentVerificationController } from "../src/controllers/studentVerification.controller";
import { isRegistrationEligibleForPayment } from "../src/repositories/payment.repository";
import type { StudentVerificationRepository } from "../src/repositories/studentVerification.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createApiRouter } from "../src/routes";
import { createStudentVerificationRouter } from "../src/routes/studentVerification.routes";
import { StudentVerificationService } from "../src/services/studentVerification.service";
import {
  canTransitionStudentVerification,
  type CreatedStudentApplication,
  type StudentApplicationInput,
  type StudentVerificationListFilters,
  type StudentVerificationListResult,
} from "../src/types/studentVerification";
import type { AdminRole } from "../src/types/admin";
import { studentApplicationSchema } from "../src/validators/studentVerification.validator";

const packageId = "9f54a313-4132-4c15-9177-4c2e83f083b1";
const validInput = {
  packageId,
  firstName: "Ada",
  lastName: "Okafor",
  email: "ada@example.edu",
  mobile: "+234 800 000 0000",
  telephone: "",
  country: "Nigeria",
  mainObjective: "Learn from industry experts and meet future collaborators.",
  heardAboutSource: "University department",
  privacyConsent: true,
  dataSharingConsent: false,
  institutionName: "University of Lagos",
  institutionCountry: "Nigeria",
  programmeOfStudy: "Mechanical Engineering",
  studentIdentificationNumber: "UL-2025-1234",
  expectedGraduationYear: 2028,
  institutionalEmail: " ADA.OKAFOR@UNILAG.EDU.NG ",
};

class FakeStudentVerificationRepository implements StudentVerificationRepository {
  created: StudentApplicationInput | null = null;
  listFilters: StudentVerificationListFilters | null = null;

  async createApplication(
    input: StudentApplicationInput,
    nextReference: () => string,
    _continuation: { readonly tokenHash: string; readonly expiresAt: Date },
  ): Promise<
    Omit<
      CreatedStudentApplication,
      "continuationToken" | "continuationTokenExpiresAt"
    >
  > {
    this.created = input;
    return {
      reference: nextReference(),
      registrationStatus: "SUBMITTED",
      paymentStatus: "PENDING",
      verificationStatus: "NOT_SUBMITTED",
      paymentAvailable: false,
      email: input.email,
      emailVerificationStatus: "UNVERIFIED",
    };
  }

  async list(
    filters: StudentVerificationListFilters,
  ): Promise<StudentVerificationListResult> {
    this.listFilters = filters;
    return {
      items: [
        {
          registrationReference: "AIAIAC-DEL-STUDENT1",
          delegateName: "Ada Okafor",
          institutionName: "University of Lagos",
          institutionCountry: "Nigeria",
          programmeOfStudy: "Mechanical Engineering",
          verificationStatus: "NOT_SUBMITTED",
          emailVerificationStatus: "UNVERIFIED",
          submittedAt: null,
          reviewedAt: null,
          createdAt: new Date("2026-09-20T10:00:00.000Z"),
          evidence: [],
          evidenceReadiness: {
            hasAvailableStudentId: false,
            hasAvailableEnrolmentEvidence: false,
            minimumEvidenceReady: false,
          },
        },
      ],
      total: 1,
      page: filters.page,
      limit: filters.limit,
    };
  }
}

function buildApp() {
  const repository = new FakeStudentVerificationRepository();
  const service = new StudentVerificationService(
    repository,
    () => "AIAIAC-DEL-STUDENT1",
  );
  const controller = createStudentVerificationController(service);
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
      fullName: "Test Admin",
      email: "admin@example.com",
      role,
    };
    next();
  };
  const app = createApplication({
    apiRouter: createApiRouter({
      studentVerificationRouter: createStudentVerificationRouter({
        controller,
        rateLimiter: (_request, _response, next) => next(),
      }),
      adminRouter: createAdminRouter({
        requireAuth,
        studentVerificationController: controller,
      }),
    }),
  });
  return { app, repository };
}

test("Student package migration creates an active unpriced package and future-ready tables", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "migrations/20260920010000000_student-verification-foundation.ts",
    ),
    "utf8",
  );
  assert.match(source, /'Student Delegate'/);
  assert.match(source, /'STUDENT'/);
  assert.match(source, /NULL,\s*NULL,\s*true/);
  assert.doesNotMatch(source, /\b75000\b|\b80000\b|\$750|\$800/);
  assert.match(source, /createTable\("student_verifications"/);
  assert.match(source, /createTable\("student_verification_events"/);
});

test("Student academic input is normalized and institutional email is optional", () => {
  const withEmail = studentApplicationSchema.safeParse(validInput);
  assert.equal(withEmail.success, true);
  if (withEmail.success) {
    assert.equal(withEmail.data.institutionalEmail, "ada.okafor@unilag.edu.ng");
  }
  const withoutEmail = studentApplicationSchema.safeParse({
    ...validInput,
    institutionalEmail: "",
  });
  assert.equal(withoutEmail.success, true);
  if (withoutEmail.success)
    assert.equal(withoutEmail.data.institutionalEmail, undefined);
});

test("Student academic validation rejects missing, malformed, sensitive, and status input", () => {
  assert.equal(
    studentApplicationSchema.safeParse({ ...validInput, institutionName: "" })
      .success,
    false,
  );
  assert.equal(
    studentApplicationSchema.safeParse({
      ...validInput,
      expectedGraduationYear: 2025,
    }).success,
    false,
  );
  assert.equal(
    studentApplicationSchema.safeParse({
      ...validInput,
      institutionalEmail: "not-an-email",
    }).success,
    false,
  );
  assert.equal(
    studentApplicationSchema.safeParse({ ...validInput, status: "APPROVED" })
      .success,
    false,
  );
  assert.equal(
    studentApplicationSchema.safeParse({
      ...validInput,
      nationalIdentityNumber: "123",
    }).success,
    false,
  );
});

test("public Student application saves academic details as NOT_SUBMITTED without payment", async () => {
  const { app, repository } = buildApp();
  const response = await request(app)
    .post("/api/student-delegate-applications")
    .send(validInput)
    .expect(201);
  assert.equal(response.body.data.reference, "AIAIAC-DEL-STUDENT1");
  assert.equal(response.body.data.verificationStatus, "NOT_SUBMITTED");
  assert.equal(response.body.data.paymentAvailable, false);
  assert.equal(response.body.data.paymentStatus, "PENDING");
  assert.equal(
    repository.created?.institutionalEmail,
    "ada.okafor@unilag.edu.ng",
  );
  assert.equal("id" in response.body.data, false);
});

test("verification transition model allows only the documented state changes", () => {
  assert.equal(
    canTransitionStudentVerification("NOT_SUBMITTED", "PENDING"),
    true,
  );
  assert.equal(canTransitionStudentVerification("PENDING", "APPROVED"), true);
  assert.equal(canTransitionStudentVerification("PENDING", "REJECTED"), true);
  assert.equal(
    canTransitionStudentVerification("PENDING", "MORE_INFORMATION_REQUIRED"),
    true,
  );
  assert.equal(
    canTransitionStudentVerification("MORE_INFORMATION_REQUIRED", "PENDING"),
    true,
  );
  assert.equal(
    canTransitionStudentVerification("NOT_SUBMITTED", "APPROVED"),
    false,
  );
  assert.equal(canTransitionStudentVerification("APPROVED", "PENDING"), false);
  assert.equal(canTransitionStudentVerification("REJECTED", "PENDING"), false);
});

test("Student payment eligibility cannot be bypassed before approval", () => {
  for (const status of ["NOT_SUBMITTED", "PENDING", "MORE_INFORMATION_REQUIRED", "REJECTED"]) {
    assert.equal(
      isRegistrationEligibleForPayment({
        packageType: "STUDENT",
        registrationStatus: "SUBMITTED",
        studentVerificationStatus: status,
        emailVerificationStatus: "VERIFIED",
      }),
      false,
      status,
    );
  }
  assert.equal(
    isRegistrationEligibleForPayment({
      packageType: "STUDENT",
      registrationStatus: "SUBMITTED",
      studentVerificationStatus: "NOT_SUBMITTED",
      emailVerificationStatus: "VERIFIED",
    }),
    false,
  );
  assert.equal(
    isRegistrationEligibleForPayment({
      packageType: "STUDENT",
      registrationStatus: "SUBMITTED",
      studentVerificationStatus: "PENDING",
      emailVerificationStatus: "VERIFIED",
    }),
    false,
  );
  assert.equal(
    isRegistrationEligibleForPayment({
      packageType: "STUDENT",
      registrationStatus: "SUBMITTED",
      studentVerificationStatus: "APPROVED",
      emailVerificationStatus: "VERIFIED",
    }),
    true,
  );
  assert.equal(
    isRegistrationEligibleForPayment({
      packageType: "PROFESSIONAL",
      registrationStatus: "SUBMITTED",
      studentVerificationStatus: null,
      emailVerificationStatus: "VERIFIED",
    }),
    true,
  );
});

test("Student verification queue enforces authentication and permission policy", async () => {
  const { app, repository } = buildApp();
  await request(app).get("/api/admin/student-verifications").expect(401);
  for (const role of ["ADMIN", "FINANCE", "COMMUNICATIONS"]) {
    await request(app)
      .get("/api/admin/student-verifications")
      .set("x-test-role", role)
      .expect(403);
  }
  for (const role of ["SUPER_ADMIN", "REGISTRATION_MANAGER"]) {
    const response = await request(app)
      .get(
        "/api/admin/student-verifications?status=NOT_SUBMITTED&search=Unilag",
      )
      .set("x-test-role", role)
      .expect(200);
    assert.equal(
      response.body.data.verifications.items[0].verificationStatus,
      "NOT_SUBMITTED",
    );
  }
  assert.equal(repository.listFilters?.status, "NOT_SUBMITTED");
  assert.equal(repository.listFilters?.search, "Unilag");
});

test("Student verification queue rejects arbitrary status filters and exposes no review endpoint", async () => {
  const { app } = buildApp();
  await request(app)
    .get("/api/admin/student-verifications?status=VERIFIED")
    .set("x-test-role", "SUPER_ADMIN")
    .expect(400);
  await request(app)
    .patch("/api/admin/student-verifications/AIAIAC-DEL-STUDENT1")
    .set("x-test-role", "SUPER_ADMIN")
    .send({ status: "APPROVED" })
    .expect(404);
});
