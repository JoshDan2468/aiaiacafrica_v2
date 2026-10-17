import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { chmod, mkdir, mkdtemp, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { ClamdStudentEvidenceScanner } from "../src/studentEvidence/clamd.scanner";
import { PrivateStudentEvidenceStorage } from "../src/studentEvidence/local.storage";
import { prepareProductionStudentEvidenceProviders } from "../src/studentEvidence/providers";

const sample = Buffer.from("validated evidence bytes");
const input = {
  bytes: sample,
  detectedMimeType: "application/pdf" as const,
  checksumSha256: "a".repeat(64),
};

async function withDaemon(
  answer: string | null,
  work: (scanner: ClamdStudentEvidenceScanner) => Promise<void>,
) {
  const daemon = createServer((socket) => {
    let received = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      received = Buffer.concat([received, chunk]);
      if (received.equals(Buffer.from("zPING\0"))) {
        if (answer === null) socket.end();
        else socket.end(`${answer}\0`);
        return;
      }
      const prefix = Buffer.from("zINSTREAM\0");
      if (!received.subarray(0, prefix.length).equals(prefix)) return;
      if (received.length < prefix.length + 8) return;
      const length = received.readUInt32BE(prefix.length);
      if (received.length < prefix.length + 4 + length + 4) return;
      assert.equal(length, sample.length);
      assert.deepEqual(received.subarray(prefix.length + 4, prefix.length + 4 + length), sample);
      assert.equal(received.readUInt32BE(prefix.length + 4 + length), 0);
      if (answer === null) socket.end();
      else socket.end(`${answer}\0`);
    });
  });
  await new Promise<void>((resolve) => daemon.listen(0, "127.0.0.1", resolve));
  const address = daemon.address();
  assert.ok(address && typeof address !== "string");
  const scanner = new ClamdStudentEvidenceScanner("test-only", () =>
    createConnection(address.port, "127.0.0.1"),
  );
  try {
    await work(scanner);
  } finally {
    await new Promise<void>((resolve) => daemon.close(() => resolve()));
  }
}

test("clamd readiness requires an exact PONG", async () => {
  await withDaemon("PONG", (scanner) => scanner.checkReady());
  await withDaemon("NOT READY", async (scanner) => {
    await assert.rejects(scanner.checkReady(), /unavailable/);
  });
  await withDaemon(null, async (scanner) => {
    await assert.rejects(scanner.checkReady(), /unavailable/);
  });
});

test("clamd INSTREAM accepts explicit clean, rejects infection, and fails closed", async () => {
  await withDaemon("stream: OK", async (scanner) => {
    assert.equal(await scanner.scan(input), "CLEAN");
  });
  await withDaemon("stream: Eicar-Signature FOUND", async (scanner) => {
    assert.equal(await scanner.scan(input), "INFECTED");
  });
  await withDaemon("stream: size limit exceeded ERROR", async (scanner) => {
    assert.equal(await scanner.scan(input), "ERROR");
  });
  await withDaemon(null, async (scanner) => {
    await assert.rejects(scanner.scan(input), /unavailable/);
  });
});

test("production private storage checks a pre-existing restricted directory", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "aiaiac-private-evidence-"));
  try {
    const storage = new PrivateStudentEvidenceStorage(directory);
    await storage.checkReady();
    const key = `${"b".repeat(64)}.pdf`;
    await storage.store(key, sample);
    assert.deepEqual(await storage.retrieve(key), sample);
    if (process.platform !== "win32") {
      assert.equal((await stat(path.join(directory, key))).mode & 0o777, 0o600);
    }
    await assert.rejects(storage.store("../outside.pdf", sample));
    await storage.delete(key);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("production private storage refuses missing and release-local directories", async () => {
  const missing = path.join(tmpdir(), `aiaiac-missing-${Date.now()}`);
  await assert.rejects(new PrivateStudentEvidenceStorage(missing).checkReady());
  await assert.rejects(new PrivateStudentEvidenceStorage(process.cwd()).checkReady());
});

test("production storage never recreates a vanished private mount", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "aiaiac-vanished-evidence-"));
  const storage = new PrivateStudentEvidenceStorage(directory);
  await storage.checkReady();
  await rm(directory, { recursive: true, force: true });
  await assert.rejects(storage.store(`${"c".repeat(64)}.pdf`, sample));
  await assert.rejects(stat(directory));
});

test(
  "production private storage rejects loose permissions and a symlink root",
  {
    skip: process.platform === "win32",
  },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "aiaiac-permissions-"));
    const link = `${directory}-link`;
    try {
      await chmod(directory, 0o755);
      await assert.rejects(new PrivateStudentEvidenceStorage(directory).checkReady(), /mode 0700/);
      await chmod(directory, 0o700);
      await symlink(directory, link, "dir");
      await assert.rejects(
        new PrivateStudentEvidenceStorage(link).checkReady(),
        /real private directory/,
      );
    } finally {
      await rm(link, { force: true });
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test("production composition verifies private storage and a responding local clamd before use", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "aiaiac-composed-evidence-"));
  const socketPath =
    process.platform === "win32"
      ? `\\\\.\\pipe\\aiaiac-clamd-${process.pid}-${Date.now()}`
      : path.join(directory, "clamd.sock");
  const daemon = createServer((socket) => {
    socket.once("data", (command: Buffer) => {
      assert.deepEqual(command, Buffer.from("zPING\0"));
      socket.end("PONG\0");
    });
  });
  try {
    await assert.rejects(
      prepareProductionStudentEvidenceProviders(directory, socketPath),
      /unavailable/,
    );
    await new Promise<void>((resolve) => daemon.listen(socketPath, resolve));
    const providers = await prepareProductionStudentEvidenceProviders(directory, socketPath);
    assert.equal(providers.storage.productionReady, true);
    assert.equal(providers.scanner.productionReady, true);

    const release = path.join(directory, "release");
    await mkdir(release);
    const source = `
      const assert = require('node:assert/strict');
      const { prepareProductionStudentEvidenceProviders } = require(${JSON.stringify(path.resolve(__dirname, "../src/studentEvidence/providers.ts"))});
      const { createConfiguredApplication } = require(${JSON.stringify(path.resolve(__dirname, "../src/app.ts"))});
      const { closeDatabasePool } = require(${JSON.stringify(path.resolve(__dirname, "../src/config/database.ts"))});
      const request = require(${JSON.stringify(require.resolve("supertest"))});
      (async () => {
        try {
          const providers = await prepareProductionStudentEvidenceProviders(process.env.STUDENT_EVIDENCE_STORAGE_DIR, process.env.STUDENT_EVIDENCE_CLAMD_SOCKET);
          const app = createConfiguredApplication({ studentEvidenceProviders: providers });
          const response = await request(app).get('/api/health');
          assert.equal(response.status, 200);
          assert.equal(response.body.environment, 'production');
        } finally { await closeDatabasePool(); }
      })().catch(() => { process.exitCode = 1; });
    `;
    await promisify(execFile)(
      process.execPath,
      ["--import", pathToFileURL(require.resolve("tsx")).href, "-e", source],
      {
        cwd: release,
        timeout: 15_000,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          NODE_ENV: "production",
          STUDENT_EVIDENCE_ENABLED: "true",
          STUDENT_EVIDENCE_STORAGE_DIR: directory,
          STUDENT_EVIDENCE_CLAMD_SOCKET: socketPath,
          CLIENT_URL: "https://public.example,https://admin.example",
          PUBLIC_FRONTEND_URL: "https://public.example",
          ADMIN_FRONTEND_URL: "https://admin.example",
          DATABASE_URL: "postgresql://test:test@database.invalid/test",
          DATABASE_SSL_MODE: "verify-full",
          SESSION_SECRET: "synthetic-test-session-secret-at-least-32-characters",
          TRUST_PROXY_HOPS: "1",
          MAILJET_API_KEY: "synthetic-test-api-key",
          MAILJET_SECRET_KEY: "synthetic-test-secret-key",
          MAILJET_FROM_EMAIL: "sender@example.com",
          PAYSTACK_SECRET_KEY: "synthetic-test-paystack-key",
          PAYSTACK_CALLBACK_URL: "https://public.example/registration/payment/callback",
        },
      },
    );
  } finally {
    await new Promise<void>((resolve) => daemon.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
