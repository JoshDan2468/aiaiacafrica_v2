import assert from "node:assert/strict";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import type { QueryResult } from "pg";
import request from "supertest";
import { createApplication } from "../src/app";
import { createReportController } from "../src/controllers/report.controller";
import { createAdminMutationSecurity } from "../src/middleware/adminMutationSecurity.middleware";
import {
  createReportRepository,
  type ReportRepository,
} from "../src/repositories/report.repository";
import { csvCell, csvHeader, csvRow } from "../src/reports/csv";
import { createReportRouter } from "../src/routes/report.routes";
import { ReportService } from "../src/services/report.service";
import type { AdminRole } from "../src/types/admin";
import {
  reportDomains,
  type ReportDomain,
  type ReportFilters,
  type ReportRow,
} from "../src/types/report";
import { parseReportFilters } from "../src/validators/report.validator";

function result<T extends Record<string, unknown>>(rows: T[]): QueryResult<T> {
  return { command: "SELECT", rowCount: rows.length, oid: 0, fields: [], rows };
}

test("domain-specific filter allowlists reject unknown, malformed and overlong ranges", () => {
  assert.equal(
    parseReportFilters("delegates", {
      status: "APPROVED",
      paymentStatus: "PAID",
      page: "2",
    })?.page,
    2,
  );
  assert.equal(
    parseReportFilters("students", { status: "APPROVED" })?.status,
    "APPROVED",
  );
  assert.equal(
    parseReportFilters("payments", { status: "PAID", currency: "NGN" })
      ?.currency,
    "NGN",
  );
  assert.equal(
    parseReportFilters("sponsors", { package: "TITLE" })?.package,
    "TITLE",
  );
  assert.equal(
    parseReportFilters("exhibitors", { package: "9_SQM" })?.package,
    "9_SQM",
  );
  assert.equal(
    parseReportFilters("abstracts", { status: "ACCEPTED" })?.status,
    "ACCEPTED",
  );
  assert.equal(
    parseReportFilters("enquiries", { category: "GENERAL" })?.category,
    "GENERAL",
  );
  assert.equal(parseReportFilters("payments", { category: "GENERAL" }), null);
  assert.equal(parseReportFilters("delegates", { status: "PAID" }), null);
  assert.equal(
    parseReportFilters("enquiries", { customSql: "DROP TABLE" }),
    null,
  );
  assert.equal(
    parseReportFilters("payments", {
      dateFrom: "2025-01-01",
      dateTo: "2027-01-01",
    }),
    null,
  );
  assert.equal(
    parseReportFilters("payments", {
      dateFrom: "2027-02-01",
      dateTo: "2027-01-01",
    }),
    null,
  );
  assert.equal(
    parseReportFilters("payments", { dateFrom: "2027-02-30" }),
    null,
  );
  assert.equal(parseReportFilters("payments", { limit: "1000" }), null);
});

test("all seven report domains use explicit projections and parameterized filters", async () => {
  const queries: { sql: string; params: unknown[] }[] = [];
  const executor = {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql, params });
      return result([]);
    },
  };
  const repository = createReportRepository(executor as never);
  for (const domain of reportDomains) {
    const filters: ReportFilters = {
      page: 1,
      limit: 20,
      dateFrom: "2027-01-01",
      dateTo: "2027-02-01",
      status:
        domain === "delegates"
          ? "APPROVED"
          : domain === "students"
            ? "PENDING"
            : domain === "payments"
              ? "PAID"
              : domain === "sponsors" || domain === "exhibitors"
                ? "CONFIRMED"
                : domain === "abstracts"
                  ? "ACCEPTED"
                  : "OPEN",
    };
    await repository.rows(domain, filters, 0, 20);
    const query = queries.at(-1)!;
    assert.match(query.sql, /WHERE .* >= \$1 AND .* < \$2 AND .* = \$3/s);
    assert.equal(query.params[2], filters.status);
    assert.ok(repository.columns(domain).length >= 7);
    assert.doesNotMatch(query.sql, /SELECT \*/i);
  }
  await repository.rows(
    "payments",
    {
      page: 1,
      limit: 20,
      status: "PAID",
      currency: "USD",
      package: "PROFESSIONAL",
    },
    0,
    20,
  );
  assert.deepEqual(queries.at(-1)?.params.slice(0, 3), [
    "PAID",
    "USD",
    "PROFESSIONAL",
  ]);
  await repository.rows(
    "enquiries",
    { page: 1, limit: 20, category: "MEDIA" },
    0,
    20,
  );
  assert.equal(queries.at(-1)?.params[0], "MEDIA");
  const paymentSql =
    queries.find((query) => query.sql.includes("payment_transactions"))?.sql ??
    "";
  assert.doesNotMatch(
    paymentSql,
    /access_code|authorization_url|webhook_signature|secret_key/i,
  );
  const studentSql =
    queries.find((query) => query.sql.includes("student_verifications"))?.sql ??
    "";
  assert.doesNotMatch(
    studentSql,
    /storage_key|evidence_documents|student_identification_number/i,
  );
  const abstractSql =
    queries.find((query) => query.sql.includes("abstract_submissions"))?.sql ??
    "";
  assert.doesNotMatch(
    abstractSql,
    /continuation_token|recovery_token|submission_key_hash/i,
  );
  const enquirySql =
    queries.find((query) => query.sql.includes("enquiries e"))?.sql ?? "";
  assert.doesNotMatch(enquirySql, /internal_note/i);
});

test("financial summary queries only authoritative PAID snapshots and separates currencies", async () => {
  const queries: string[] = [];
  const executor = {
    async query(sql: string) {
      queries.push(sql);
      return queries.length === 1
        ? result([
            {
              professional_registrations: "4",
              paid_professional: "2",
              pending_professional: "1",
              ngn_revenue_minor: "210000000",
              usd_revenue_minor: "150000",
              sponsors: "3",
              confirmed_sponsors: "1",
              exhibitors: "2",
              confirmed_exhibitors: "1",
              abstracts: "5",
              accepted_abstracts: "2",
              open_enquiries: "6",
            },
          ])
        : result([{ status: "PENDING", total: "3" }]);
    },
  };
  const summary = await createReportRepository(executor as never).summary(
    new Date("2026-09-24T00:00:00Z"),
  );
  assert.equal(summary.professionalRegistrations, 4);
  assert.deepEqual(summary.confirmedRevenueMinor, {
    NGN: 210000000,
    USD: 150000,
  });
  assert.equal(summary.studentsByStatus["PENDING"], 3);
  assert.match(
    queries[0]!,
    /pt\.id=dr\.authoritative_payment_transaction_id WHERE pt\.status='PAID' AND pt\.currency='NGN'/,
  );
  assert.match(
    queries[0]!,
    /pt\.id=dr\.authoritative_payment_transaction_id WHERE pt\.status='PAID' AND pt\.currency='USD'/,
  );
  assert.doesNotMatch(queries[0]!, /sum\([^)]*NGN[^)]*USD/i);
});

test("CSV has stable headers, escaping and spreadsheet formula protection", () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell("  +SUM(1,2)"), '"\'  +SUM(1,2)"');
  assert.equal(csvCell("-10"), '"\'-10"');
  assert.equal(csvCell("@cmd"), '"\'@cmd"');
  assert.equal(csvCell("ordinary, text"), '"ordinary, text"');
  assert.equal(csvHeader([{ key: "name", label: "Name" }]), '"Name"\r\n');
  assert.equal(
    csvRow([{ key: "name", label: "Name" }], { name: "=1+1" }),
    '"\'=1+1"\r\n',
  );
});

function fixture(total = 1) {
  const audits: {
    adminId: string;
    domain: ReportDomain;
    filters: ReportFilters;
  }[] = [];
  const sample: ReportRow = {
    reference: "AIAIAC-DEL-ABCDEFGH",
    name: '=HYPERLINK("x")',
  };
  const repository = {
    columns: () => [
      { key: "reference", label: "Registration Reference" },
      { key: "name", label: "Delegate Name" },
    ],
    count: async () => total,
    rows: async () => [sample],
    summary: async () => ({
      professionalRegistrations: 1,
      confirmedRevenueMinor: { NGN: 0, USD: 0 },
    }),
    auditExport: async (
      adminId: string,
      domain: ReportDomain,
      filters: ReportFilters,
    ) => {
      audits.push({ adminId, domain, filters });
    },
  } as unknown as ReportRepository;
  const controller = createReportController(new ReportService(repository));
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "00000000-0000-4000-8000-000000000001",
      fullName: "Tester",
      email: "test@example.com",
      role,
    };
    next();
  };
  const router = Router();
  router.use(
    "/admin/reports",
    createReportRouter({
      requireAuth,
      mutationSecurity: createAdminMutationSecurity(["http://localhost:5173"]),
      controller,
    }),
  );
  return { app: createApplication({ apiRouter: router }), audits };
}

test("report API requires authentication, domain permission and financial permission", async () => {
  const { app } = fixture();
  await request(app).get("/api/admin/reports/delegates").expect(401);
  await request(app)
    .get("/api/admin/reports/payments")
    .set("x-test-role", "ADMIN")
    .expect(403);
  await request(app)
    .get("/api/admin/reports/summary")
    .set("x-test-role", "ADMIN")
    .expect(403);
  await request(app)
    .get("/api/admin/reports/delegates")
    .set("x-test-role", "FINANCE")
    .expect(403);
  await request(app)
    .get("/api/admin/reports/payments")
    .set("x-test-role", "FINANCE")
    .expect(200);
  await request(app)
    .get("/api/admin/reports/enquiries")
    .set("x-test-role", "COMMUNICATIONS")
    .expect(200);
  await request(app)
    .get("/api/admin/reports/payments")
    .set("x-test-role", "COMMUNICATIONS")
    .expect(403);
  await request(app)
    .get("/api/admin/reports/summary")
    .set("x-test-role", "SUPER_ADMIN")
    .expect(200);
});

test("preview validates filters and server pagination", async () => {
  const { app } = fixture(27);
  const response = await request(app)
    .get("/api/admin/reports/delegates?page=2&limit=10&status=APPROVED")
    .set("x-test-role", "ADMIN")
    .expect(200);
  assert.equal(response.body.data.report.page, 2);
  assert.equal(response.body.data.report.totalPages, 3);
  assert.equal(response.body.data.report.total, 27);
  await request(app)
    .get("/api/admin/reports/delegates?rawSql=1")
    .set("x-test-role", "ADMIN")
    .expect(400);
  await request(app)
    .get("/api/admin/reports/payments?currency=EUR")
    .set("x-test-role", "FINANCE")
    .expect(400);
});

test("CSV export requires CSRF, records metadata audit and excludes restricted columns", async () => {
  const { app, audits } = fixture();
  await request(app)
    .post("/api/admin/reports/delegates/export")
    .set("x-test-role", "ADMIN")
    .expect(403);
  await request(app)
    .post("/api/admin/reports/enquiries/export")
    .set("x-test-role", "COMMUNICATIONS")
    .set("x-aiaiac-csrf", "1")
    .expect(403);
  const response = await request(app)
    .post("/api/admin/reports/delegates/export?status=APPROVED")
    .set("x-test-role", "ADMIN")
    .set("x-aiaiac-csrf", "1")
    .expect(200);
  assert.match(String(response.headers["content-type"]), /text\/csv/);
  assert.match(String(response.headers["cache-control"]), /no-store/);
  assert.match(response.text, /"'=HYPERLINK/);
  assert.doesNotMatch(response.text, /access_code|storage_key|recovery_token/i);
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.domain, "delegates");
  assert.equal(audits[0]?.filters.status, "APPROVED");
});

test("oversized exports fail before audit or stream", async () => {
  const { app, audits } = fixture(50_001);
  await request(app)
    .post("/api/admin/reports/delegates/export")
    .set("x-test-role", "ADMIN")
    .set("x-aiaiac-csrf", "1")
    .expect(413);
  assert.equal(audits.length, 0);
});
