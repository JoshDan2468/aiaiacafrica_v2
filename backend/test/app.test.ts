import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { errorHandler } from "../src/middleware/error.middleware";
import { notFoundHandler } from "../src/middleware/notFound.middleware";
import { createApiRouter } from "../src/routes";

function createReadinessTestApp(checkDatabaseConnection: () => Promise<void>): express.Express {
  const testApp = express();
  testApp.use("/api", createApiRouter({ checkDatabaseConnection }));
  testApp.use(notFoundHandler);
  testApp.use(errorHandler);
  return testApp;
}

const app = createApplication();

test("GET /api/health returns the public health payload", async () => {
  const response = await request(app).get("/api/health").expect(200).expect("Content-Type", /json/);

  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "AIAIAC API is running");
  assert.equal(response.body.environment, "development");
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});

test("GET /api/health does not require a database check", async () => {
  let databaseCheckCalls = 0;
  const testApp = createReadinessTestApp(async () => {
    databaseCheckCalls += 1;
    throw new Error("The health endpoint must not query PostgreSQL");
  });

  const response = await request(testApp)
    .get("/api/health")
    .expect(200)
    .expect("Content-Type", /json/);

  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "AIAIAC API is running");
  assert.equal(databaseCheckCalls, 0);
});

test("GET /api/ready returns success when the database check succeeds", async () => {
  const testApp = createReadinessTestApp(async () => undefined);

  const response = await request(testApp)
    .get("/api/ready")
    .expect(200)
    .expect("Content-Type", /json/);

  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "AIAIAC API is ready");
  assert.equal(response.body.database, "connected");
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(response.headers["cache-control"], "no-store");
});

test("GET /api/ready returns a sanitized 503 when the database check fails", async () => {
  const sensitiveDetail = "postgresql://admin:secret@example.invalid/aiaiac";
  const testApp = createReadinessTestApp(async () => {
    throw new Error(sensitiveDetail);
  });

  const response = await request(testApp)
    .get("/api/ready")
    .expect(503)
    .expect("Content-Type", /json/);

  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "AIAIAC API is not ready");
  assert.equal(response.body.database, "disconnected");
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(JSON.stringify(response.body).includes(sensitiveDetail), false);
  assert.equal(JSON.stringify(response.body).includes("stack"), false);
  assert.equal(response.headers["cache-control"], "no-store");
});

test("unknown API routes return predictable JSON", async () => {
  const response = await request(app).get("/api/does-not-exist").expect(404);

  assert.deepEqual(response.body, {
    success: false,
    message: "API route not found",
  });
});

test("CORS permits the configured frontend origin", async () => {
  const response = await request(app)
    .get("/api/health")
    .set("Origin", "http://localhost:5173")
    .expect(200);

  assert.equal(response.headers["access-control-allow-origin"], "http://localhost:5173");
  assert.equal(response.headers["access-control-allow-credentials"], "true");
});

test("CORS rejects unconfigured browser origins", async () => {
  const response = await request(app)
    .get("/api/health")
    .set("Origin", "https://untrusted.example")
    .expect(403);

  assert.deepEqual(response.body, {
    success: false,
    message: "Origin not allowed",
  });
});

test("malformed JSON uses the central error response", async () => {
  const response = await request(app)
    .post("/api/health")
    .set("Content-Type", "application/json")
    .send('{"broken"')
    .expect(400);

  assert.deepEqual(response.body, {
    success: false,
    message: "Invalid JSON request body",
  });
  assert.equal(JSON.stringify(response.body).includes("stack"), false);
});

test("unexpected errors are sanitized", async () => {
  const testApp = express();
  testApp.get("/boom", () => {
    throw new Error("sensitive internal detail");
  });
  testApp.use(errorHandler);

  const response = await request(testApp).get("/boom").expect(500);

  assert.deepEqual(response.body, {
    success: false,
    message: "Internal server error",
  });
  assert.equal(JSON.stringify(response.body).includes("sensitive internal detail"), false);
});
