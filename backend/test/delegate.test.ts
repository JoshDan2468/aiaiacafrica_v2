import assert from "node:assert/strict";
import test from "node:test";
import type { RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createDelegateController } from "../src/controllers/delegate.controller";
import { createDelegateRegistrationRateLimiter } from "../src/middleware/delegateRegistrationRateLimit.middleware";
import { createPublicError } from "../src/middleware/error.middleware";
import {
  DelegatePackageUnavailableError,
  DuplicateDelegateRegistrationError,
  type DelegateRepository,
} from "../src/repositories/delegate.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createDelegateRouter } from "../src/routes/delegate.routes";
import { createApiRouter } from "../src/routes";
import { DelegateService } from "../src/services/delegate.service";
import type {
  CreatedDelegateRegistration,
  DelegateListFilters,
  DelegateListResult,
  DelegatePackage,
  DelegateRegistrationDetail,
  DelegateRegistrationInput,
} from "../src/types/delegate";

const packageRecord: DelegatePackage = {
  id: "7b1f1c1d-8f18-4d41-9921-4d663958a201",
  slug: "professional-delegate",
  name: "Professional Delegate",
  delegateType: "PROFESSIONAL",
  description: "Conference participation.",
  benefits: ["Technical knowledge exchange"],
  currency: "USD",
  priceMinor: 150000,
  prices: [
    { currency: "USD", amountMinor: 150000 },
    { currency: "NGN", amountMinor: 210000000 },
  ],
  paymentAvailable: true,
  verificationRequired: false,
  pricingStatus: "AVAILABLE",
};

const input: DelegateRegistrationInput = {
  packageId: packageRecord.id,
  firstName: "Ada",
  lastName: "Okafor",
  email: "ada@example.com",
  mobile: "+234 800 000 0000",
  jobTitle: "Integrity Engineer",
  companyName: "Example Energy",
  country: "Nigeria",
  primaryActivity: "Asset integrity",
  mainObjective: "Exchange practical integrity and automation knowledge.",
  heardAboutSource: "Professional network",
  privacyConsent: true,
  dataSharingConsent: false,
};

class FakeDelegateRepository implements DelegateRepository {
  packages: DelegatePackage[] = [packageRecord];
  registrations: DelegateRegistrationInput[] = [];
  listFilters: DelegateListFilters | null = null;
  detail: DelegateRegistrationDetail | null = {
    id: "e38d27ad-590d-4c7b-8e30-e48f0a4f8f3d",
    reference: "AIAIAC-DEL-ABCD2345",
    firstName: "Ada",
    lastName: "Okafor",
    companyName: "Example Energy",
    packageName: packageRecord.name,
    country: "Nigeria",
    registrationStatus: "SUBMITTED",
    paymentStatus: "PENDING",
    emailVerificationStatus: "VERIFIED",
    submittedAt: new Date("2026-09-02T10:00:00.000Z"),
    email: "ada@example.com",
    mobile: "+234 800 000 0000",
    telephone: null,
    jobTitle: "Integrity Engineer",
    primaryActivity: "Asset integrity",
    mainObjective: "Exchange practical integrity and automation knowledge.",
    heardAboutSource: "Professional network",
    privacyConsent: true,
    dataSharingConsent: false,
    packageId: packageRecord.id,
    packageType: "PROFESSIONAL",
    packageDescription: packageRecord.description,
    packageBenefits: packageRecord.benefits,
    currency: "USD",
    priceMinor: 150000,
    createdAt: new Date("2026-09-02T10:00:00.000Z"),
    updatedAt: new Date("2026-09-02T10:00:00.000Z"),
    emailVerifiedAt: new Date("2026-09-02T10:00:00.000Z"),
    authoritativePayment: null,
  };
  duplicate = false;
  unavailable = false;

  async listPublicPackages(): Promise<DelegatePackage[]> {
    return this.packages;
  }

  async createRegistration(
    value: DelegateRegistrationInput,
    nextReference: () => string,
  ): Promise<CreatedDelegateRegistration> {
    if (this.unavailable) throw new DelegatePackageUnavailableError();
    if (this.duplicate) throw new DuplicateDelegateRegistrationError();
    this.registrations.push(value);
    return {
      id: "e38d27ad-590d-4c7b-8e30-e48f0a4f8f3d",
      reference: nextReference(),
      registrationStatus: "SUBMITTED",
      paymentStatus: "PENDING",
      email: value.email,
      emailVerificationStatus: "UNVERIFIED",
      submittedAt: new Date("2026-09-02T10:00:00.000Z"),
    };
  }

  async listRegistrations(
    filters: DelegateListFilters,
  ): Promise<DelegateListResult> {
    this.listFilters = filters;
    return {
      items: this.detail ? [this.detail] : [],
      total: this.detail ? 1 : 0,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async findRegistrationById(
    id: string,
  ): Promise<DelegateRegistrationDetail | null> {
    return this.detail?.id === id ? this.detail : null;
  }
}

function createTestApplication(repository = new FakeDelegateRepository()) {
  const service = new DelegateService(repository, () => "AIAIAC-DEL-ABCD2345");
  const controller = createDelegateController({ delegateService: service });
  const requireAuth: RequestHandler = (request, response, next) => {
    const role = request.header("x-test-role");
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      next(createPublicError(401, "Authentication is required"));
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
      delegateRouter: createDelegateRouter({
        controller,
        registrationRateLimiter: createDelegateRegistrationRateLimiter({
          windowMs: 60_000,
          max: 100,
        }),
      }),
      adminRouter: createAdminRouter(requireAuth, controller),
    }),
  });
  return { app, repository };
}

test("public delegate packages expose only active package data", async () => {
  const { app } = createTestApplication();
  const response = await request(app).get("/api/delegate-packages").expect(200);
  assert.equal(response.body.data.packages[0].name, "Professional Delegate");
  assert.equal(response.body.data.packages[0].priceMinor, 150000);
  assert.deepEqual(response.body.data.packages[0].prices, [
    { currency: "USD", amountMinor: 150000 },
    { currency: "NGN", amountMinor: 210000000 },
  ]);
  assert.equal(JSON.stringify(response.body).includes("capacity"), false);
});

test("delegate registration validates strictly, derives statuses, and never accepts price", async () => {
  const { app, repository } = createTestApplication();
  const response = await request(app)
    .post("/api/delegate-registrations")
    .send({ ...input, priceMinor: 1 })
    .expect(400);
  assert.equal(response.body.message, "Invalid delegate registration request");

  const created = await request(app)
    .post("/api/delegate-registrations")
    .send({ ...input, email: " ADA@EXAMPLE.COM ", telephone: "" })
    .expect(201);
  assert.equal(
    created.body.message,
    "Delegate registration submitted successfully.",
  );
  assert.equal(created.body.data.reference, "AIAIAC-DEL-ABCD2345");
  assert.equal(created.body.data.registrationStatus, "SUBMITTED");
  assert.equal(created.body.data.paymentStatus, "PENDING");
  assert.equal("id" in created.body.data, false);
  assert.equal(repository.registrations[0]?.email, "ada@example.com");
  assert.equal(repository.registrations[0]?.telephone, undefined);
});

test("delegate registration safely handles duplicate and unavailable packages", async () => {
  const { app, repository } = createTestApplication();
  repository.duplicate = true;
  await request(app)
    .post("/api/delegate-registrations")
    .send(input)
    .expect(409);
  repository.duplicate = false;
  repository.unavailable = true;
  const response = await request(app)
    .post("/api/delegate-registrations")
    .send(input)
    .expect(400);
  assert.equal(
    response.body.message,
    "The selected delegate package is not available.",
  );
});

test("admin delegate list and detail require ADMIN or SUPER_ADMIN and protect full PII", async () => {
  const { app, repository } = createTestApplication();
  await request(app).get("/api/admin/delegates").expect(401);
  const list = await request(app)
    .get("/api/admin/delegates?search=Ada&country=Nigeria&page=2&limit=10")
    .set("x-test-role", "ADMIN")
    .expect(200);
  assert.equal(list.body.data.registrations.items[0].email, "ada@example.com");
  assert.equal(repository.listFilters?.search, "Ada");
  assert.equal(repository.listFilters?.page, 2);
  const detail = await request(app)
    .get(`/api/admin/delegates/${repository.detail?.id}`)
    .set("x-test-role", "SUPER_ADMIN")
    .expect(200);
  assert.equal(detail.body.data.registration.email, "ada@example.com");
  await request(app)
    .get("/api/admin/delegates/not-a-uuid")
    .set("x-test-role", "ADMIN")
    .expect(400);
  await request(app)
    .get("/api/admin/delegates/9c347bcb-2b88-4e73-8a49-421249345a9f")
    .set("x-test-role", "ADMIN")
    .expect(404);
});
