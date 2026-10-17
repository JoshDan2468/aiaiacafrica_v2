import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApplication } from "../src/app";
import { createEmailVerificationController } from "../src/controllers/emailVerification.controller";
import { EmailService } from "../src/email/email.service";
import type { TransactionalEmail } from "../src/email/email.types";
import type { EmailVerificationRepository } from "../src/repositories/emailVerification.repository";
import { isRegistrationEligibleForPayment } from "../src/repositories/payment.repository";
import { createEmailVerificationRouter } from "../src/routes/emailVerification.routes";
import { createEmailVerificationRateLimiter } from "../src/middleware/emailVerificationRateLimit.middleware";
import {
  EmailVerificationService,
  EmailVerificationTokenError,
  hashEmailVerificationToken,
} from "../src/services/emailVerification.service";
import type {
  EmailVerificationIssueResult,
  EmailVerificationResult,
} from "../src/types/emailVerification";

class FakeRepository implements EmailVerificationRepository {
  issuedHash: string | null = null;
  delivery: boolean | null = null;
  issueResult: EmailVerificationIssueResult = {
    kind: "ISSUED",
    recipient: {
      registrationId: "3df008ae-57dc-48b9-99e1-5b67f4b1a214",
      registrationReference: "AIAIAC-DEL-ABCD2345",
      email: "ada@example.com",
      fullName: "Ada Okafor",
      delegateType: "PROFESSIONAL",
      expiresAt: new Date("2026-09-29T10:00:00.000Z"),
    },
  };
  verificationResult: EmailVerificationResult = {
    kind: "VERIFIED",
    registrationReference: "AIAIAC-DEL-ABCD2345",
    delegateType: "PROFESSIONAL",
    availablePrices: [{ currency: "NGN", amountMinor: 210000000 }],
  };

  async issue(
    _reference: string,
    _email: string | null,
    tokenHash: string,
  ): Promise<EmailVerificationIssueResult> {
    this.issuedHash = tokenHash;
    return this.issueResult;
  }

  async recordDelivery(_registrationId: string, sent: boolean): Promise<void> {
    this.delivery = sent;
  }

  async verify(): Promise<EmailVerificationResult> {
    return this.verificationResult;
  }
}

test("initial verification stores only a hash and sends the raw token through EmailService", async () => {
  const repository = new FakeRepository();
  const messages: TransactionalEmail[] = [];
  const rawToken = "A".repeat(43);
  const email = new EmailService(
    {
      async send(message) {
        messages.push(message);
      },
    },
    "https://admin.example.test",
    "https://conference.example.test",
  );
  const service = new EmailVerificationService(
    repository,
    email,
    24,
    () => new Date("2026-09-28T10:00:00.000Z"),
    () => rawToken,
  );

  assert.equal(await service.issueInitial("AIAIAC-DEL-ABCD2345"), true);
  assert.equal(repository.issuedHash, hashEmailVerificationToken(rawToken));
  assert.notEqual(repository.issuedHash, rawToken);
  assert.equal(repository.delivery, true);
  assert.equal(messages.length, 1);
  assert.match(messages[0]!.text, new RegExp(`#token=${rawToken}`));
  assert.equal(messages[0]!.subject, "Verify your email — AIAIAC Africa 2027");
  assert.doesNotMatch(messages[0]!.text, /QR|Event Pass|complete payment/i);
});
test("delivery failure leaves issuance intact and returns a safe false status", async () => {
  const repository = new FakeRepository();
  const service = new EmailVerificationService(
    repository,
    {
      async sendEmailVerification() {
        throw new Error("Synthetic email failure");
      },
    },
    24,
    undefined,
    () => "B".repeat(43),
  );
  assert.equal(await service.issueInitial("AIAIAC-DEL-ABCD2345"), false);
  assert.equal(repository.delivery, false);
  assert.equal(repository.issuedHash?.length, 64);
});

test("already verified resend is safe and does not deliver another email", async () => {
  const repository = new FakeRepository();
  repository.issueResult = { kind: "ALREADY_VERIFIED" };
  let deliveries = 0;
  const service = new EmailVerificationService(repository, {
    async sendEmailVerification() {
      deliveries += 1;
    },
  });
  await service.resend("AIAIAC-DEL-ABCD2345", "ada@example.com");
  assert.equal(deliveries, 0);
  assert.equal(repository.delivery, null);
});

test("verification tokens are strictly validated before repository lookup", async () => {
  const service = new EmailVerificationService(new FakeRepository(), {
    async sendEmailVerification() {},
  });
  await assert.rejects(
    () => service.verify("not-a-token"),
    EmailVerificationTokenError,
  );
});

test("email verification is mandatory in addition to existing category rules", () => {
  assert.equal(
    isRegistrationEligibleForPayment({
      packageType: "PROFESSIONAL",
      registrationStatus: "SUBMITTED",
      studentVerificationStatus: null,
      emailVerificationStatus: "UNVERIFIED",
    }),
    false,
  );
  assert.equal(
    isRegistrationEligibleForPayment({
      packageType: "STUDENT",
      registrationStatus: "SUBMITTED",
      studentVerificationStatus: "APPROVED",
      emailVerificationStatus: "UNVERIFIED",
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
});

test("public resend is enumeration-resistant and malformed verification is generic", async () => {
  const service = new EmailVerificationService(new FakeRepository(), {
    async sendEmailVerification() {},
  });
  const router = createEmailVerificationRouter({
    controller: createEmailVerificationController(service),
    rateLimiter: (_request, _response, next) => next(),
  });
  const app = createApplication({ apiRouter: router });
  const unknown = await request(app)
    .post("/api/email-verification/resend")
    .send({ registrationReference: "invalid", email: "invalid" })
    .expect(202);
  assert.match(unknown.body.message, /If the registration details match/i);
  const invalid = await request(app)
    .post("/api/email-verification/verify")
    .send({ token: "invalid" })
    .expect(400);
  assert.equal(invalid.body.message, "Verification link is invalid or expired");
});

test("public verification endpoints are bounded by the dedicated rate limiter", async () => {
  const service = new EmailVerificationService(new FakeRepository(), {
    async sendEmailVerification() {},
  });
  const app = createApplication({
    apiRouter: createEmailVerificationRouter({
      controller: createEmailVerificationController(service),
      rateLimiter: createEmailVerificationRateLimiter({
        windowMs: 60_000,
        max: 1,
      }),
    }),
  });
  await request(app)
    .post("/api/email-verification/resend")
    .send({ registrationReference: "invalid", email: "invalid" })
    .expect(202);
  await request(app)
    .post("/api/email-verification/resend")
    .send({ registrationReference: "invalid", email: "invalid" })
    .expect(429);
});
