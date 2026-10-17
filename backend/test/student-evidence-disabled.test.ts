import assert from "node:assert/strict";
import test from "node:test";
import type { RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createStudentVerificationController } from "../src/controllers/studentVerification.controller";
import { createStudentVerificationRouter } from "../src/routes/studentVerification.routes";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createApiRouter } from "../src/routes";
import type { StudentVerificationService } from "../src/services/studentVerification.service";

test("disabled evidence routes reject before access, multipart parsing or Student data reads/writes", async () => {
  let applicationWrites = 0;
  let parserCalls = 0;
  const controller = createStudentVerificationController(
    {
      async createApplication() {
        applicationWrites++;
        return { reference: "AIAIAC-DEL-STUDENT1" };
      },
      list() {
        throw new Error("Disabled evidence must not read Student records");
      },
    } as unknown as StudentVerificationService,
    undefined,
    undefined,
    false,
  );
  const next: RequestHandler = (_request, _response, next) => next();
  const multipart: RequestHandler = (_request, _response, next) => {
    parserCalls++;
    next();
  };
  const requireAuth: RequestHandler = (_request, response, next) => {
    response.locals.admin = { id: "admin-test", role: "SUPER_ADMIN" };
    next();
  };
  const app = createApplication({
    apiRouter: createApiRouter({
      studentVerificationRouter: createStudentVerificationRouter({
        controller,
        rateLimiter: next,
        workflowRateLimiter: next,
        uploadRateLimiter: next,
        requestSizeLimit: multipart,
        multipartParser: multipart,
      }),
      adminRouter: createAdminRouter({ requireAuth, studentVerificationController: controller }),
    }),
  });
  const reference = "AIAIAC-DEL-STUDENT1";
  const publicBase = `/api/student-delegate-applications/${reference}`;
  for (const [method, path] of [
    ["get", `${publicBase}/evidence`],
    ["post", `${publicBase}/evidence`],
    ["post", `${publicBase}/evidence/example/replace`],
    ["get", `${publicBase}/verification`],
    ["post", `${publicBase}/verification/submit`],
    ["get", "/api/admin/student-verifications"],
    ["get", `/api/admin/student-verifications/${reference}`],
    ["get", `/api/admin/student-verifications/${reference}/evidence/example/download`],
  ] as const) {
    const response = await request(app)[method](path).expect(503);
    assert.match(response.body.message, /temporarily unavailable/);
    assert.equal(response.headers["cache-control"], "no-store");
  }
  assert.equal(parserCalls, 0);
  assert.equal(applicationWrites, 0);

  // Saving Student registration details remains separate from evidence submission.
  await request(app)
    .post("/api/student-delegate-applications")
    .send({
      packageId: "9f54a313-4132-4c15-9177-4c2e83f083b1",
      firstName: "Ada",
      lastName: "Okafor",
      email: "ada@example.com",
      mobile: "+2348000000000",
      country: "Nigeria",
      mainObjective: "Learn about engineering",
      heardAboutSource: "Website",
      privacyConsent: true,
      dataSharingConsent: false,
      institutionName: "University of Lagos",
      institutionCountry: "Nigeria",
      programmeOfStudy: "Engineering",
      studentIdentificationNumber: "STU123",
      expectedGraduationYear: 2027,
    })
    .expect(201);
  assert.equal(applicationWrites, 1);
});
