import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { parseCommercialImport } from "../src/services/commercialImport";
import { CommercialImportService } from "../src/services/commercialImport.service";
import type {
  DatabaseExecutor,
  TransactionRunner,
} from "../src/types/database";
import { createCommercialApplicationController } from "../src/controllers/commercialApplication.controller";
import type { CommercialApplicationService } from "../src/services/commercialApplication.service";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createAdminMutationSecurity } from "../src/middleware/adminMutationSecurity.middleware";
import { getPermissionsForRole } from "../src/config/permissions";
import { errorHandler } from "../src/middleware/error.middleware";

const headers =
  "organizationName,country,contactFirstName,contactLastName,contactEmail,contactPhone,packageCode";
const csv = `${headers}\nFixture Energy,Nigeria,Ada,Example,ada@example.invalid,08012345678,GOLD`;
const input = {
  csv,
  source: "Offline approvals",
  approvalEvidence: "Approved by conference committee",
};
test("approved imports validate category and duplicate normalized emails without claiming consent", () => {
  const parsed = parseCommercialImport(
    csv +
      "\nFixture Energy,Nigeria,Ada,Example,ADA@EXAMPLE.INVALID,08012345678,GOLD",
    "SPONSOR",
  );
  assert.equal(parsed.candidates.length, 1);
  assert.equal(parsed.summary.skipped, 1);
  assert.equal(parseCommercialImport(csv, "EXHIBITOR").summary.invalid, 1);
  assert.throws(() =>
    parseCommercialImport(csv.replace("packageCode", "consent"), "SPONSOR"),
  );
  assert.throws(() =>
    parseCommercialImport(
      headers +
        "\n" +
        Array(51)
          .fill(
            "Fixture Energy,Nigeria,Ada,Example,ada@example.invalid,08012345678,GOLD",
          )
          .join("\n"),
      "SPONSOR",
    ),
  );
});
test("preview is read only; acknowledged commit creates confirmed record and audits without notifications", async () => {
  const statements: string[] = [];
  const db = {
    query: async (sql: string) => {
      statements.push(sql);
      return {
        rows: sql.startsWith("SELECT id,code")
          ? [
              {
                id: "package",
                code: "GOLD",
                name: "Gold sponsor",
                currency: "USD",
                price_minor: "3000000",
              },
            ]
          : sql.startsWith("INSERT INTO sponsor_applications")
            ? [{ id: "application" }]
            : [],
      };
    },
  } as unknown as DatabaseExecutor;
  const tx: TransactionRunner = async (work) => work(db as never);
  const service = new CommercialImportService(db, tx);
  assert.equal((await service.process("SPONSOR", input, null)).valid, 1);
  assert.equal(
    statements.some((sql) => sql.startsWith("INSERT")),
    false,
  );
  await assert.rejects(service.process("SPONSOR", input, "admin"));
  assert.equal(
    (
      await service.process(
        "SPONSOR",
        { ...input, acknowledged: true },
        "admin",
      )
    ).imported,
    1,
  );
  assert.ok(statements.some((sql) => sql.includes("false,'CONFIRMED'")));
  assert.ok(
    statements.some((sql) => sql.includes("sponsor_application_history")),
  );
  assert.ok(
    statements.some((sql) => sql.includes("COMMERCIAL_APPLICATION_IMPORTED")),
  );
  assert.equal(
    statements.some(
      (sql) =>
        sql.includes("_notifications") ||
        sql.includes("payment_transactions") ||
        sql.includes("event_passes"),
    ),
    false,
  );
});
test("import routes require authenticated commercial management and mutation protection", async () => {
  let invoked = 0;
  const imports = {
    process: async () => {
      invoked++;
      return { valid: 1 };
    },
  } as unknown as CommercialImportService;
  const controller = createCommercialApplicationController(
    {} as CommercialApplicationService,
    imports,
  );
  const app = express();
  app.use(express.json());
  app.use(
    "/api/admin",
    createAdminRouter({
      commercialApplicationController: controller,
      mutationSecurity: createAdminMutationSecurity([
        "https://admin.example.invalid",
      ]),
      requireAuth: (req, res, next) => {
        const role = req.headers["x-fixture-role"];
        if (!role) {
          res.status(401).end();
          return;
        }
        res.locals.admin = {
          id: "fixture",
          role: role === "ADMIN" ? "ADMIN" : "FINANCE",
          permissions: getPermissionsForRole(
            role === "ADMIN" ? "ADMIN" : "FINANCE",
          ),
        };
        next();
      },
    }),
  );
  app.use(errorHandler);
  await request(app)
    .post("/api/admin/sponsor-applications/import-preview")
    .send(input)
    .expect(401);
  await request(app)
    .post("/api/admin/sponsor-applications/import-preview")
    .set("x-fixture-role", "FINANCE")
    .set("Origin", "https://admin.example.invalid")
    .set("X-AIAIAC-CSRF", "1")
    .send(input)
    .expect(403);
  await request(app)
    .post("/api/admin/exhibitor-applications/import-approved")
    .set("x-fixture-role", "ADMIN")
    .send(input)
    .expect(403);
  assert.equal(invoked, 0);
  await request(app)
    .post("/api/admin/sponsor-applications/import-preview")
    .set("x-fixture-role", "ADMIN")
    .set("Origin", "https://admin.example.invalid")
    .set("X-AIAIAC-CSRF", "1")
    .send(input)
    .expect(200);
  assert.equal(invoked, 1);
});
