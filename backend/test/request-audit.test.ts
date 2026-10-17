import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import express from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createRequestLogger } from "../src/middleware/requestLogger.middleware";
import { AuditFile, AUDIT_MAX_BYTES, AUDIT_MAX_FILES } from "../src/observability/auditFile";
import { reportRecoveredPaymentError } from "../src/observability/operationContext";

async function temporaryDirectory(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "aiaiac-audit-test-"));
}

test("request, payment response, and error events share a correlation ID without sensitive data", async () => {
  const directory = await temporaryDirectory();
  try {
    const sink = new AuditFile(directory);
    const router = express.Router();
    const registrationReference = "AIAIAC-DEL-ABCD1234";
    const paymentReference = `AIAIAC-PAY-${"A".repeat(24)}`;
    router.post("/delegate-registrations/:reference/payment/initialize", (_req, res) => {
      res.json({
        success: true,
        data: {
          payment: {
            registrationReference,
            paymentReference,
            status: "PENDING",
            currency: "NGN",
            amountMinor: 250000,
            authorizationUrl: "https://gateway.example/secret-token",
            accessCode: "private-access-code",
          },
        },
      });
    });
    router.get("/payments/:reference/verify", () => {
      throw new Error("private provider failure: secret-token");
    });
    const app = createApplication({
      apiRouter: router,
      requestLogger: createRequestLogger({ sink, pseudonymKey: "audit-test-key" }),
    });
    const success = await request(app)
      .post(
        `/api/delegate-registrations/${registrationReference}/payment/initialize?token=secret-token`,
      )
      .send({ email: "person@example.com", currency: "NGN", password: "private-password" })
      .expect(200);
    const failure = await request(app).get(`/api/payments/${paymentReference}/verify`).expect(500);
    await sink.flush();

    const text = await fs.readFile(path.join(directory, "request-response.log"), "utf8");
    const entries = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(entries.length, 5);
    assert.equal(
      entries.filter((entry) => entry.correlationId === success.headers["x-request-id"]).length,
      2,
    );
    assert.equal(
      entries.filter((entry) => entry.correlationId === failure.headers["x-request-id"]).length,
      3,
    );
    const payment = entries.find((entry) => entry.paymentStatus === "PENDING");
    assert.equal(payment.amountMinor, 250000);
    assert.equal(payment.currency, "NGN");
    assert.match(payment.registrationId, /^[0-9a-f]{24}$/);
    assert.match(payment.paymentId, /^[0-9a-f]{24}$/);
    assert.ok(entries.some((entry) => entry.event === "operation_error" && entry.status === 500));
    assert.ok(entries.some((entry) => entry.event === "response_error" && entry.status === 500));
    for (const secret of [
      registrationReference,
      paymentReference,
      "person@example.com",
      "secret-token",
      "private-password",
      "private-access-code",
    ]) {
      assert.equal(text.includes(secret), false, `${secret} must not appear in the log`);
    }
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("audit files rotate before the size ceiling and retain no more than the file cap", async () => {
  const directory = await temporaryDirectory();
  try {
    const sink = new AuditFile(directory, 180, 3);
    for (let index = 0; index < 30; index += 1) {
      await sink.write({ event: "response", correlationId: String(index).padStart(36, "0") });
      const files = (await fs.readdir(directory)).filter((name) =>
        name.startsWith("request-response."),
      );
      assert.ok(files.length <= 3);
      for (const name of files) {
        assert.ok((await fs.stat(path.join(directory, name))).size <= 180);
      }
    }
    assert.throws(() => new AuditFile(directory, AUDIT_MAX_BYTES + 1, AUDIT_MAX_FILES));
    assert.throws(() => new AuditFile(directory, AUDIT_MAX_BYTES, AUDIT_MAX_FILES + 1));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("recovered payment errors remain correlated even when the HTTP response succeeds", async () => {
  const directory = await temporaryDirectory();
  try {
    const sink = new AuditFile(directory);
    const paymentReference = `AIAIAC-PAY-${"B".repeat(24)}`;
    const router = express.Router();
    router.get("/payments/:reference/verify", async (req, res) => {
      await Promise.resolve();
      reportRecoveredPaymentError(
        new Error("secret gateway failure"),
        "payment_recovery",
        req.params.reference,
      );
      res.json({ success: true });
    });
    const app = createApplication({
      apiRouter: router,
      requestLogger: createRequestLogger({ sink, pseudonymKey: "audit-test-key" }),
    });
    const response = await request(app).get(`/api/payments/${paymentReference}/verify`).expect(200);
    await sink.flush();
    const text = await fs.readFile(path.join(directory, "request-response.log"), "utf8");
    const entries = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(
      entries.map((entry) => entry.event),
      ["request", "operation_error", "response"],
    );
    assert.ok(entries.every((entry) => entry.correlationId === response.headers["x-request-id"]));
    assert.equal(entries[1].recovered, true);
    assert.equal(entries[1].stage, "payment_recovery");
    assert.equal(entries[1].paymentId, entries[2].paymentId);
    assert.equal(text.includes(paymentReference), false);
    assert.equal(text.includes("secret gateway failure"), false);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("startup prunes old and oversized managed files without touching unrelated files", async () => {
  const directory = await temporaryDirectory();
  try {
    for (let index = 0; index < 25; index += 1) {
      const name = `request-response.${String(1_700_000_000_000 + index)}-${String(index).padStart(32, "0")}.log`;
      await fs.writeFile(path.join(directory, name), "old\n");
    }
    await fs.writeFile(path.join(directory, "request-response.log"), "x".repeat(181));
    await fs.writeFile(path.join(directory, "keep.txt"), "unrelated");
    const sink = new AuditFile(directory, 180, 3);
    await sink.write({ event: "request" });
    const files = await fs.readdir(directory);
    assert.equal(files.filter((name) => name.startsWith("request-response.")).length, 3);
    assert.ok((await fs.stat(path.join(directory, "request-response.log"))).size <= 180);
    assert.equal(await fs.readFile(path.join(directory, "keep.txt"), "utf8"), "unrelated");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
