import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { LocalStudentEvidenceStorage } from "../src/studentEvidence/local.storage";
import { UnavailableMalwareScanner } from "../src/studentEvidence/malwareScanner";
import {
  createStudentEvidenceProviders,
  type StudentEvidenceProviders,
} from "../src/studentEvidence/providers";

const production = {
  production: true,
  localStorageDirectory: ".private/student-evidence",
};

// Test doubles exercise wiring only; these are not deployable production adapters.
function reviewedProviderDoubles(): StudentEvidenceProviders {
  return {
    storage: {
      productionReady: true,
      async store() {},
      async retrieve() {
        return Buffer.from("evidence");
      },
      async delete() {},
    },
    scanner: {
      productionReady: true,
      async scan() {
        return "CLEAN";
      },
    },
  };
}

test("production requires an explicitly configured pair, without development fallback", () => {
  assert.throws(() => createStudentEvidenceProviders(production), /explicitly configured/);
});

test("production accepts the supplied pair only when both providers are production-ready", () => {
  const providers = reviewedProviderDoubles();
  const selected = createStudentEvidenceProviders(production, providers);
  assert.equal(selected.storage, providers.storage);
  assert.equal(selected.scanner, providers.scanner);
});

test("production rejects local storage even with a production-ready scanner", () => {
  assert.throws(
    () =>
      createStudentEvidenceProviders(production, {
        ...reviewedProviderDoubles(),
        storage: new LocalStudentEvidenceStorage(production.localStorageDirectory),
      }),
    /production storage and malware scanner are not configured/,
  );
});

test("production rejects an unavailable scanner even with production-ready storage", () => {
  assert.throws(
    () =>
      createStudentEvidenceProviders(production, {
        ...reviewedProviderDoubles(),
        scanner: new UnavailableMalwareScanner(),
      }),
    /production storage and malware scanner are not configured/,
  );
});

test("production rejects missing provider methods or incomplete pairs", () => {
  for (const providers of [
    { storage: reviewedProviderDoubles().storage },
    { scanner: reviewedProviderDoubles().scanner },
    { ...reviewedProviderDoubles(), storage: { productionReady: true } },
    { ...reviewedProviderDoubles(), scanner: { productionReady: true } },
  ]) {
    assert.throws(
      () => createStudentEvidenceProviders(production, providers as StudentEvidenceProviders),
      /Invalid Student evidence provider interfaces/,
    );
  }
});

test("production rejects truthy but invalid readiness markers", () => {
  for (const field of ["storage", "scanner"] as const) {
    const providers = reviewedProviderDoubles();
    const invalid = {
      ...providers,
      [field]: { ...providers[field], productionReady: "true" },
    } as unknown as StudentEvidenceProviders;
    assert.throws(() => createStudentEvidenceProviders(production, invalid), /not configured/);
  }
});

test("development retains local private storage and the fail-closed unavailable scanner", async () => {
  const selected = createStudentEvidenceProviders({
    ...production,
    production: false,
  });
  assert.equal(selected.storage.productionReady, undefined);
  assert.equal(selected.scanner.productionReady, undefined);
  assert.equal(
    await selected.scanner.scan({
      bytes: Buffer.from("evidence"),
      detectedMimeType: "application/pdf",
      checksumSha256: "a".repeat(64),
    }),
    "UNAVAILABLE",
  );
  assert.ok(selected.storage instanceof LocalStudentEvidenceStorage);
  assert.ok(selected.scanner instanceof UnavailableMalwareScanner);
});

test("configured application serves health only with a valid production pair; development still starts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "aiaiac-student-startup-"));
  const appPath = path.resolve(__dirname, "../src/app.ts");
  const databasePath = path.resolve(__dirname, "../src/config/database.ts");
  const localPath = path.resolve(__dirname, "../src/studentEvidence/local.storage.ts");
  const scannerPath = path.resolve(__dirname, "../src/studentEvidence/malwareScanner.ts");
  try {
    for (const scenario of [
      "ready",
      "missing",
      "local",
      "unavailable",
      "development",
      "disabled",
    ]) {
      const source = `
        const assert = require('node:assert/strict');
        const { createConfiguredApplication } = require(${JSON.stringify(appPath)});
        const { closeDatabasePool } = require(${JSON.stringify(databasePath)});
        const request = require(${JSON.stringify(require.resolve("supertest"))});
        const scenario = ${JSON.stringify(scenario)};
        const providers = {
          storage: { productionReady: true, async store() {}, async retrieve() { return Buffer.alloc(0); }, async delete() {} },
          scanner: { productionReady: true, async scan() { return 'CLEAN'; } },
        };
        if (scenario === 'local') {
          const { LocalStudentEvidenceStorage } = require(${JSON.stringify(localPath)});
          providers.storage = new LocalStudentEvidenceStorage('.private/student-evidence');
        }
        if (scenario === 'unavailable') {
          const { UnavailableMalwareScanner } = require(${JSON.stringify(scannerPath)});
          providers.scanner = new UnavailableMalwareScanner();
        }
        (async () => {
          try {
            const options = scenario === 'disabled'
              ? { get studentEvidenceProviders() { throw new Error('Disabled evidence must not select providers'); } }
              : ['missing', 'development'].includes(scenario) ? {} : { studentEvidenceProviders: providers };
            if (['missing', 'local', 'unavailable'].includes(scenario)) {
              assert.throws(() => createConfiguredApplication(options), /Student evidence/);
            } else {
              const app = createConfiguredApplication(options);
              const response = await request(app).get('/api/health');
              assert.equal(response.status, 200);
              if (scenario === 'disabled') {
                const reference = 'AIAIAC-DEL-STUDENT1';
                for (const [method, suffix] of [
                  ['get', '/evidence'], ['post', '/evidence'],
                  ['post', '/evidence/example/replace'], ['get', '/verification'],
                  ['post', '/verification/submit'],
                ]) {
                  await request(app)[method]('/api/student-delegate-applications/' + reference + suffix).expect(503);
                }
              }
            }
          } finally { await closeDatabasePool(); }
        })().catch(() => { process.exitCode = 1; });
      `;
      // An empty working directory and a minimal environment prevent loading the real .env.
      await promisify(execFile)(
        process.execPath,
        ["--import", pathToFileURL(require.resolve("tsx")).href, "-e", source],
        {
          cwd: directory,
          timeout: 30_000,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            NODE_ENV: scenario === "development" ? "development" : "production",
            STUDENT_EVIDENCE_ENABLED: scenario === "disabled" ? "false" : "true",
            STUDENT_EVIDENCE_STORAGE_DIR: directory,
            STUDENT_EVIDENCE_CLAMD_SOCKET: path.join(directory, "clamd.sock"),
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
    }
  } finally {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith("aiaiac-student-startup-"));
    await rm(directory, { recursive: true, force: true });
  }
});
