import assert from "node:assert/strict";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { EmailService } from "../src/email/email.service";
import type { EmailProvider } from "../src/email/email.types";
import { postgresCommercialApplicationRepository } from "../src/repositories/commercialApplication.repository";
import { postgresAdminOverviewRepository } from "../src/repositories/adminOverview.repository";
import { CommercialApplicationService } from "../src/services/commercialApplication.service";

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool)
    throw new Error("DATABASE_URL is required for commercial acceptance");

  const suffix = Date.now().toString(36);
  const emailProvider: EmailProvider = { async send() {} };
  const service = new CommercialApplicationService(
    postgresCommercialApplicationRepository,
    new EmailService(emailProvider, "http://localhost:5173"),
  );

  let sponsorReference: string | null = null;
  let exhibitorReference: string | null = null;

  async function scalar(sql: string): Promise<string> {
    const result = await pool!.query<{ value: string }>(sql);
    return result.rows[0]?.value ?? "0";
  }

  try {
    const admin = await pool.query<{ id: string }>(
      "SELECT id FROM admins WHERE is_active = true ORDER BY created_at ASC LIMIT 1",
    );
    const adminId = admin.rows[0]?.id;
    if (!adminId)
      throw new Error(
        "An active Admin is required for acceptance review decisions",
      );

    const before = {
      payments: await scalar(
        "SELECT count(*)::text AS value FROM payment_transactions",
      ),
      passes: await scalar(
        "SELECT count(*)::text AS value FROM delegate_event_passes",
      ),
      revenue: await scalar(
        "SELECT COALESCE(sum(amount_minor), 0)::text AS value FROM payment_transactions WHERE status = 'PAID'",
      ),
    };
    const beforeOverview = await postgresAdminOverviewRepository.getOverview();

    const sponsor = await service.createSponsor({
      organizationName: `Acceptance Sponsor ${suffix}`,
      country: "Nigeria",
      website: "https://example.com",
      industry: "Energy",
      contactFirstName: "Synthetic",
      contactLastName: "Sponsor",
      contactEmail: `sponsor-${suffix}@example.com`,
      contactPhone: "+2348000000000",
      contactJobTitle: "Commercial Director",
      notes: "Controlled Milestone 4A acceptance record.",
      sponsorshipTier: "GOLD",
      consent: true,
    });
    sponsorReference = sponsor.reference;
    assert.equal(sponsor.status, "SUBMITTED");
    assert.equal(sponsor.currency, "USD");
    assert.equal(sponsor.priceMinor, 3_000_000);
    await service.review(
      "SPONSOR",
      sponsor.reference,
      "MORE_INFORMATION_REQUIRED",
      adminId,
      "Please confirm the organization legal name for contracting.",
      null,
    );
    await service.review(
      "SPONSOR",
      sponsor.reference,
      "CONFIRMED",
      adminId,
      null,
      "Synthetic acceptance approval.",
    );
    const sponsorDetail = await service.getDetail("SPONSOR", sponsor.reference);
    assert.equal(sponsorDetail?.status, "CONFIRMED");
    assert.deepEqual(
      sponsorDetail?.history.map((item) => item.action),
      ["SUBMITTED", "MORE_INFORMATION_REQUIRED", "CONFIRMED"],
    );

    const exhibitor = await service.createExhibitor({
      organizationName: `Acceptance Exhibitor ${suffix}`,
      country: "Ghana",
      contactFirstName: "Synthetic",
      contactLastName: "Exhibitor",
      contactEmail: `exhibitor-${suffix}@example.com`,
      contactPhone: "+233200000000",
      exhibitionOption: "18_SQM",
      consent: true,
    });
    exhibitorReference = exhibitor.reference;
    assert.equal(exhibitor.priceMinor, 1_398_000);
    await service.review(
      "EXHIBITOR",
      exhibitor.reference,
      "CONFIRMED",
      adminId,
      null,
      null,
    );
    const exhibitorDetail = await service.getDetail(
      "EXHIBITOR",
      exhibitor.reference,
    );
    assert.equal(exhibitorDetail?.status, "CONFIRMED");
    assert.deepEqual(
      exhibitorDetail?.history.map((item) => item.action),
      ["SUBMITTED", "CONFIRMED"],
    );

    const notificationCounts = await pool.query<{
      sponsor: string;
      exhibitor: string;
    }>(
      `SELECT
       (SELECT count(*)::text FROM sponsor_application_notifications n
        JOIN sponsor_applications a ON a.id = n.application_id WHERE a.reference = $1) AS sponsor,
       (SELECT count(*)::text FROM exhibitor_application_notifications n
        JOIN exhibitor_applications a ON a.id = n.application_id WHERE a.reference = $2) AS exhibitor`,
      [sponsor.reference, exhibitor.reference],
    );
    assert.equal(notificationCounts.rows[0]?.sponsor, "3");
    assert.equal(notificationCounts.rows[0]?.exhibitor, "2");

    const after = {
      payments: await scalar(
        "SELECT count(*)::text AS value FROM payment_transactions",
      ),
      passes: await scalar(
        "SELECT count(*)::text AS value FROM delegate_event_passes",
      ),
      revenue: await scalar(
        "SELECT COALESCE(sum(amount_minor), 0)::text AS value FROM payment_transactions WHERE status = 'PAID'",
      ),
    };
    assert.deepEqual(after, before);
    const afterOverview = await postgresAdminOverviewRepository.getOverview();
    assert.equal(
      afterOverview.metrics.sponsorApplications,
      beforeOverview.metrics.sponsorApplications + 1,
    );
    assert.equal(
      afterOverview.metrics.confirmedSponsors,
      beforeOverview.metrics.confirmedSponsors + 1,
    );
    assert.equal(
      afterOverview.metrics.exhibitorApplications,
      beforeOverview.metrics.exhibitorApplications + 1,
    );
    assert.equal(
      afterOverview.metrics.confirmedExhibitors,
      beforeOverview.metrics.confirmedExhibitors + 1,
    );
    assert.deepEqual(
      afterOverview.metrics.confirmedRevenue,
      beforeOverview.metrics.confirmedRevenue,
    );
    console.log(
      JSON.stringify({
        sponsorReference,
        exhibitorReference,
        sponsorHistory: 3,
        exhibitorHistory: 2,
        notificationCounts: notificationCounts.rows[0],
        overviewCommercialCountsIncreasedFromPostgreSQL: true,
        paymentEventPassRevenueUnchanged: true,
      }),
    );
  } finally {
    if (sponsorReference) {
      await pool.query(
        "DELETE FROM sponsor_applications WHERE reference = $1",
        [sponsorReference],
      );
    }
    if (exhibitorReference) {
      await pool.query(
        "DELETE FROM exhibitor_applications WHERE reference = $1",
        [exhibitorReference],
      );
    }
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
