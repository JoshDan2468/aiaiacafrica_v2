import assert from "node:assert/strict";
import test from "node:test";
import { Router, type RequestHandler } from "express";
import type { QueryResult } from "pg";
import request from "supertest";
import { createApplication } from "../src/app";
import { createAdminOverviewController } from "../src/controllers/adminOverview.controller";
import { createAdminOverviewRepository } from "../src/repositories/adminOverview.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { AdminOverviewService } from "../src/services/adminOverview.service";
import type { AdminRole } from "../src/types/admin";
import type { DatabaseExecutor } from "../src/types/database";

function result<T extends Record<string, unknown>>(rows: T[]): QueryResult<T> {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

function buildOverview() {
  const queries: string[] = [];
  const executor = {
    async query(query: string) {
      queries.push(query);
      if (queries.length === 1) {
        return result([
          {
            total_registrations: "7",
            paid_registrations: "3",
            pending_payments: "2",
            ngn_revenue_minor: "420000000",
            usd_revenue_minor: "150000",
            sponsor_applications: "0",
            confirmed_sponsors: "0",
            exhibitor_applications: "0",
            confirmed_exhibitors: "0",
            abstract_submissions: "5",
            abstract_pending_review: "2",
            accepted_abstracts: "1",
            open_enquiries: "4",
          },
        ]);
      }
      return result([
        {
          type: "PAYMENT_CONFIRMED",
          registration_reference: "AIAIAC-DEL-SAFE1234",
          occurred_at: new Date("2026-09-20T10:00:00.000Z"),
        },
      ]);
    },
  } as unknown as DatabaseExecutor;
  return {
    queries,
    repository: createAdminOverviewRepository(executor),
  };
}

test("overview maps authoritative registration totals from PostgreSQL", async () => {
  const { repository } = buildOverview();
  const overview = await repository.getOverview();
  assert.equal(overview.metrics.totalRegistrations, 7);
  assert.equal(overview.metrics.paidRegistrations, 3);
  assert.equal(overview.metrics.pendingPayments, 2);
});

test("overview keeps confirmed NGN and USD revenue in distinct buckets", async () => {
  const { repository } = buildOverview();
  const overview = await repository.getOverview();
  assert.deepEqual(overview.metrics.confirmedRevenue, {
    NGN: 420000000,
    USD: 150000,
  });
});

test("overview SQL counts registrations without joining payment attempts", async () => {
  const { repository, queries } = buildOverview();
  await repository.getOverview();
  const metricsSql = queries[0]!;
  assert.match(metricsSql, /count\(\*\).*FROM delegate_registrations/s);
  assert.doesNotMatch(
    metricsSql.match(/total_registrations,[\s\S]*paid_registrations/)?.[0] ??
      "",
    /JOIN payment_transactions/,
  );
});

test("pending payments require current payment eligibility and an active price", async () => {
  const { repository, queries } = buildOverview();
  await repository.getOverview();
  const pendingSql = queries[0]!.match(
    /\(SELECT count\(\*\)::text FROM delegate_registrations dr[\s\S]*?\) AS pending_payments/,
  )?.[0];
  assert.ok(pendingSql);
  assert.match(pendingSql, /dr\.payment_status = 'PENDING'/);
  assert.match(
    pendingSql,
    /dr\.registration_status NOT IN \('REJECTED', 'CANCELLED'\)/,
  );
  assert.match(pendingSql, /dp\.delegate_type = 'PROFESSIONAL'/);
  assert.match(
    pendingSql,
    /dp\.delegate_type = 'STUDENT' AND sv\.status = 'APPROVED'/,
  );
  assert.match(
    pendingSql,
    /dpp\.package_id = dr\.package_id AND dpp\.is_active = true/,
  );
  assert.doesNotMatch(pendingSql, /JOIN payment_transactions/);
});

test("overview revenue SQL includes only authoritative PAID transactions", async () => {
  const { repository, queries } = buildOverview();
  await repository.getOverview();
  assert.equal(
    queries[0]!.match(/pt\.id = dr\.authoritative_payment_transaction_id/g)
      ?.length,
    2,
  );
  assert.equal(queries[0]!.match(/pt\.status = 'PAID'/g)?.length, 2);
  assert.doesNotMatch(queries[0]!, /status IN \([^)]*PENDING/);
});

test("overview revenue SQL filters NGN and USD independently", async () => {
  const { repository, queries } = buildOverview();
  await repository.getOverview();
  assert.match(queries[0]!, /pt\.status = 'PAID' AND pt\.currency = 'NGN'/);
  assert.match(queries[0]!, /pt\.status = 'PAID' AND pt\.currency = 'USD'/);
  assert.doesNotMatch(queries[0]!, /sum\([^)]*ngn[^)]*usd/i);
});

test("overview maps Abstract counters from PostgreSQL without affecting revenue", async () => {
  const { repository } = buildOverview();
  const overview = await repository.getOverview();
  assert.equal(overview.metrics.sponsorApplications, 0);
  assert.equal(overview.metrics.confirmedSponsors, 0);
  assert.equal(overview.metrics.exhibitorApplications, 0);
  assert.equal(overview.metrics.confirmedExhibitors, 0);
  assert.equal(overview.metrics.abstractSubmissions, 5);
  assert.equal(overview.metrics.abstractPendingReview, 2);
  assert.equal(overview.metrics.acceptedAbstracts, 1);
  assert.equal(overview.metrics.openEnquiries, 4);
});

test("overview reads open enquiry counts and activity from PostgreSQL", async () => {
  const { repository, queries } = buildOverview();
  await repository.getOverview();
  assert.match(
    queries[0]!,
    /FROM enquiries\s+WHERE status IN \('OPEN', 'IN_PROGRESS'\)/,
  );
  assert.match(queries[1]!, /FROM enquiry_events/);
});

test("recent activity is sourced from payment events and Admin audit records", async () => {
  const { repository, queries } = buildOverview();
  const overview = await repository.getOverview();
  assert.equal(
    overview.recentActivity[0]?.summary,
    "Payment confirmed for AIAIAC-DEL-SAFE1234",
  );
  assert.match(queries[1]!, /FROM payment_events/);
  assert.match(queries[1]!, /FROM admin_audit_logs/);
});

function overviewApplication() {
  const { repository } = buildOverview();
  const requireAuth: RequestHandler = (request, response, next) => {
    const role = request.header("x-test-role") as AdminRole | undefined;
    if (!role) {
      response.status(401).json({ success: false });
      return;
    }
    response.locals.admin = {
      id: "admin",
      fullName: "Test Admin",
      email: "admin@example.com",
      role,
    };
    next();
  };
  const router = Router();
  router.use(
    "/admin",
    createAdminRouter({
      requireAuth,
      adminOverviewController: createAdminOverviewController(
        new AdminOverviewService(repository),
      ),
    }),
  );
  return createApplication({ apiRouter: router });
}

test("overview API rejects anonymous and unauthorized Admin roles", async () => {
  const app = overviewApplication();
  await request(app).get("/api/admin/overview").expect(401);
  await request(app)
    .get("/api/admin/overview")
    .set("x-test-role", "COMMUNICATIONS")
    .expect(403);
});

test("overview API permits roles with registrations.read", async () => {
  const app = overviewApplication();
  const response = await request(app)
    .get("/api/admin/overview")
    .set("x-test-role", "FINANCE")
    .expect(200);
  assert.equal(response.body.data.overview.metrics.totalRegistrations, 7);
});
