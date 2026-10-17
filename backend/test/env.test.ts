import assert from "node:assert/strict";
import test from "node:test";
import { loadEnvironment } from "../src/config/env";

test("Student evidence requires an explicit false to disable and rejects invalid flag values", () => {
  assert.equal(loadEnvironment({}).studentEvidenceEnabled, true);
  assert.equal(
    loadEnvironment({ STUDENT_EVIDENCE_ENABLED: "true" })
      .studentEvidenceEnabled,
    true,
  );
  assert.equal(
    loadEnvironment({ STUDENT_EVIDENCE_ENABLED: "false" })
      .studentEvidenceEnabled,
    false,
  );
  for (const value of ["", "FALSE", "0", "disabled"]) {
    assert.throws(
      () => loadEnvironment({ STUDENT_EVIDENCE_ENABLED: value }),
      /STUDENT_EVIDENCE_ENABLED/,
    );
  }
});

test("production evidence requires explicit private storage and clamd socket paths", () => {
  const base = {
    NODE_ENV: "production",
    CLIENT_URL: "https://public.example",
    DATABASE_URL: "postgresql://app:password@example.invalid/aiaiac",
    SESSION_SECRET: "synthetic-test-session-secret-at-least-32-characters",
  };
  assert.throws(() => loadEnvironment(base), /STUDENT_EVIDENCE_STORAGE_DIR/);
  assert.throws(
    () =>
      loadEnvironment({
        ...base,
        STUDENT_EVIDENCE_STORAGE_DIR: "relative/evidence",
      }),
    /STUDENT_EVIDENCE_STORAGE_DIR/,
  );
  assert.throws(
    () =>
      loadEnvironment({
        ...base,
        STUDENT_EVIDENCE_STORAGE_DIR: "/var/lib/aiaiac/student-evidence",
      }),
    /STUDENT_EVIDENCE_CLAMD_SOCKET/,
  );
  assert.throws(
    () =>
      loadEnvironment({
        ...base,
        STUDENT_EVIDENCE_STORAGE_DIR: "/var/lib/aiaiac/student-evidence",
        STUDENT_EVIDENCE_CLAMD_SOCKET: "relative/clamd.sock",
      }),
    /STUDENT_EVIDENCE_CLAMD_SOCKET/,
  );
  const disabled = loadEnvironment({
    ...base,
    STUDENT_EVIDENCE_ENABLED: "false",
    DATABASE_SSL_MODE: "verify-full",
    TRUST_PROXY_HOPS: "1",
    MAILJET_API_KEY: "synthetic-api-key",
    MAILJET_SECRET_KEY: "synthetic-secret-key",
    MAILJET_FROM_EMAIL: "sender@example.com",
    PAYSTACK_SECRET_KEY: "synthetic-paystack-secret-key",
    PAYSTACK_CALLBACK_URL:
      "https://public.example/registration/payment/callback",
  });
  assert.equal(disabled.studentEvidenceEnabled, false);
});

test("development defaults are safe and database configuration is optional outside production", () => {
  const config = loadEnvironment({});

  assert.equal(config.nodeEnv, "development");
  assert.equal(config.port, 5000);
  assert.deepEqual(config.clientOrigins, ["http://localhost:5173"]);
  assert.equal(config.databaseUrl, undefined);
  assert.equal(config.adminSessionIdleMs, 1_800_000);
  assert.equal(config.adminSessionAbsoluteMs, 43_200_000);
  assert.equal(config.loginRateLimitWindowMs, 900_000);
  assert.equal(config.loginRateLimitMax, 100);
  assert.equal(config.adminInvitationExpiryHours, 48);
  assert.deepEqual(config.adminAllowedEmailDomains, []);
  assert.equal(config.adminFrontendUrl, "http://localhost:5173");
  assert.deepEqual(config.paymentNotificationRoles, ["SUPER_ADMIN"]);
});

test("Admin session deadlines are centrally configurable and bounded", () => {
  const config = loadEnvironment({
    ADMIN_SESSION_IDLE_MINUTES: "2",
    ADMIN_SESSION_ABSOLUTE_HOURS: "1",
  });
  assert.equal(config.adminSessionIdleMs, 120_000);
  assert.equal(config.adminSessionAbsoluteMs, 3_600_000);
  assert.throws(
    () => loadEnvironment({ ADMIN_SESSION_IDLE_MINUTES: "0" }),
    /ADMIN_SESSION_IDLE_MINUTES/,
  );
});

test("configured client origins are normalized and deduplicated", () => {
  const config = loadEnvironment({
    CLIENT_URL:
      "https://aiaiac.example, https://aiaiac.example, http://localhost:5173",
  });

  assert.deepEqual(config.clientOrigins, [
    "https://aiaiac.example",
    "http://localhost:5173",
  ]);
});

test("production requires an explicit client origin", () => {
  assert.throws(
    () => loadEnvironment({ NODE_ENV: "production" }),
    /CLIENT_URL is required in production/,
  );
});

test("production requires an explicit database URL", () => {
  assert.throws(
    () =>
      loadEnvironment({
        NODE_ENV: "production",
        CLIENT_URL: "https://aiaiac.example",
      }),
    /DATABASE_URL is required in production/,
  );
});

test("production requires a strong session secret", () => {
  assert.throws(
    () =>
      loadEnvironment({
        NODE_ENV: "production",
        CLIENT_URL: "https://aiaiac.example",
        DATABASE_URL: "postgresql://app:password@example.invalid/aiaiac",
      }),
    /SESSION_SECRET is required in production/,
  );

  assert.throws(
    () =>
      loadEnvironment({ SESSION_SECRET: "REPLACE_WITH_A_LONG_RANDOM_VALUE" }),
    /SESSION_SECRET/,
  );
});

test("wildcard CORS and invalid database protocols fail without echoing values", () => {
  assert.throws(() => loadEnvironment({ CLIENT_URL: "*" }), /CLIENT_URL/);

  const secretValue = "mysql://user:secret@example.invalid/database";
  assert.throws(
    () => loadEnvironment({ DATABASE_URL: secretValue }),
    (error: unknown) =>
      error instanceof Error && !error.message.includes(secretValue),
  );
});

test("Admin invitation domains normalize and Mailjet configuration must be complete", () => {
  const config = loadEnvironment({
    ADMIN_ALLOWED_EMAIL_DOMAINS:
      "AIAIACAFRICA.COM, aiaiacafrica.com, staff.example",
  });
  assert.deepEqual(config.adminAllowedEmailDomains, [
    "aiaiacafrica.com",
    "staff.example",
  ]);

  assert.throws(
    () => loadEnvironment({ MAILJET_API_KEY: "only-one-value" }),
    /must be configured together/,
  );
});

test("Paystack uses one backend secret and validates the callback URL", () => {
  const config = loadEnvironment({
    PAYSTACK_SECRET_KEY: "sk_test_safe_placeholder",
    PAYSTACK_CALLBACK_URL:
      "https://conference.example/registration/payment/callback",
  });
  assert.equal(config.paystack?.secretKey, "sk_test_safe_placeholder");
  assert.equal(
    config.paystack?.callbackUrl,
    "https://conference.example/registration/payment/callback",
  );
  assert.throws(
    () => loadEnvironment({ PAYSTACK_SECRET_KEY: "short" }),
    /PAYSTACK_SECRET_KEY/,
  );
  assert.throws(
    () => loadEnvironment({ PAYSTACK_CALLBACK_URL: "javascript:alert(1)" }),
    /PAYSTACK_CALLBACK_URL/,
  );
});

test("payment notification roles allow only configured oversight roles", () => {
  const config = loadEnvironment({
    PAYMENT_NOTIFICATION_ROLES: "SUPER_ADMIN, FINANCE, SUPER_ADMIN",
  });
  assert.deepEqual(config.paymentNotificationRoles, ["SUPER_ADMIN", "FINANCE"]);
  assert.throws(
    () => loadEnvironment({ PAYMENT_NOTIFICATION_ROLES: "ADMIN" }),
    /PAYMENT_NOTIFICATION_ROLES/,
  );
});

test("registration notifications include Super Admin and Admin only", () => {
  assert.deepEqual(loadEnvironment({}).registrationNotificationRoles, [
    "SUPER_ADMIN",
    "ADMIN",
  ]);
  assert.deepEqual(
    loadEnvironment({
      REGISTRATION_NOTIFICATION_ROLES: "admin, super_admin, ADMIN",
    }).registrationNotificationRoles,
    ["ADMIN", "SUPER_ADMIN"],
  );
  assert.throws(
    () => loadEnvironment({ REGISTRATION_NOTIFICATION_ROLES: "FINANCE" }),
    /REGISTRATION_NOTIFICATION_ROLES/,
  );
});

test("communications URL requires an HTTPS origin and secrets are bounded without enabling bulk", () => {
  assert.equal(
    loadEnvironment({
      COMMUNICATIONS_PUBLIC_API_URL: "https://api.example.invalid",
    }).communicationsBulkSendEnabled,
    false,
  );
  for (const url of [
    "http://api.example.invalid",
    "https://api.example.invalid/path",
    "https://user:password@api.example.invalid",
    "https://api.example.invalid?token=secret",
  ])
    assert.throws(
      () => loadEnvironment({ COMMUNICATIONS_PUBLIC_API_URL: url }),
      /COMMUNICATIONS_PUBLIC_API_URL/,
    );
  assert.throws(
    () => loadEnvironment({ COMMUNICATIONS_UNSUBSCRIBE_SECRET: "short" }),
    /COMMUNICATIONS_UNSUBSCRIBE_SECRET/,
  );
  assert.throws(
    () => loadEnvironment({ COMMUNICATIONS_MAILJET_WEBHOOK_SECRET: "short" }),
    /COMMUNICATIONS_MAILJET_WEBHOOK_SECRET/,
  );
});
