import assert from "node:assert/strict";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { postgresReportRepository } from "../src/repositories/report.repository";
import { csvHeader, csvRow } from "../src/reports/csv";
import { ReportService } from "../src/services/report.service";
import { reportDomains } from "../src/types/report";

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_URL required for report acceptance");
  const service = new ReportService(postgresReportRepository);
  let auditId: string | null = null;
  try {
    for (const domain of reportDomains) {
      const report = await service.preview(domain, { page: 1, limit: 5 });
      assert.equal(report.domain, domain);
      assert.ok(report.items.length <= 5);
      assert.ok(report.columns.length >= 7);
    }
    const summary = await service.summary();
    const direct = await pool.query<{
      professional: string;
      paid: string;
      ngn: string;
      usd: string;
      students: string;
      sponsors: string;
      exhibitors: string;
      abstracts: string;
      enquiries: string;
    }>(`SELECT
      (SELECT count(*)::text FROM delegate_registrations WHERE package_type_snapshot='PROFESSIONAL') AS professional,
      (SELECT count(*)::text FROM delegate_registrations WHERE package_type_snapshot='PROFESSIONAL' AND payment_status='PAID') AS paid,
      (SELECT COALESCE(sum(amount_minor),0)::text FROM payment_transactions WHERE status='PAID' AND currency='NGN') AS ngn,
      (SELECT COALESCE(sum(amount_minor),0)::text FROM payment_transactions WHERE status='PAID' AND currency='USD') AS usd,
      (SELECT count(*)::text FROM student_verifications) AS students,
      (SELECT count(*)::text FROM sponsor_applications) AS sponsors,
      (SELECT count(*)::text FROM exhibitor_applications) AS exhibitors,
      (SELECT count(*)::text FROM abstract_submissions) AS abstracts,
      (SELECT count(*)::text FROM enquiries WHERE status IN ('OPEN','IN_PROGRESS')) AS enquiries`);
    const row = direct.rows[0];
    assert.ok(row);
    assert.equal(summary.professionalRegistrations, Number(row.professional));
    assert.equal(summary.paidProfessionalRegistrations, Number(row.paid));
    assert.equal(summary.confirmedRevenueMinor.NGN, Number(row.ngn));
    assert.equal(summary.confirmedRevenueMinor.USD, Number(row.usd));
    assert.equal(
      Object.values(summary.studentsByStatus).reduce(
        (sum, value) => sum + value,
        0,
      ),
      Number(row.students),
    );
    assert.equal(summary.sponsorApplications, Number(row.sponsors));
    assert.equal(summary.exhibitorApplications, Number(row.exhibitors));
    assert.equal(summary.abstractSubmissions, Number(row.abstracts));
    assert.equal(summary.openEnquiries, Number(row.enquiries));
    const admin = await pool.query<{ id: string }>(
      "SELECT id FROM admins WHERE is_active=true LIMIT 1",
    );
    if (!admin.rows[0])
      throw new Error("Active Admin required for report export acceptance");
    const auditBefore = await pool.query<{ id: string }>(
      "SELECT id FROM report_export_audit ORDER BY generated_at DESC LIMIT 1",
    );
    const prepared = await service.prepareExport(
      "delegates",
      { page: 1, limit: 5 },
      admin.rows[0].id,
    );
    const audit = await pool.query<{
      id: string;
      admin_id: string;
      report_type: string;
      format: string;
    }>(
      "SELECT id,admin_id,report_type,format FROM report_export_audit ORDER BY generated_at DESC LIMIT 1",
    );
    auditId = audit.rows[0]?.id ?? null;
    assert.ok(auditId && auditId !== auditBefore.rows[0]?.id);
    assert.equal(audit.rows[0]?.admin_id, admin.rows[0].id);
    assert.equal(audit.rows[0]?.report_type, "DELEGATES");
    assert.equal(audit.rows[0]?.format, "CSV");
    let csv = `\uFEFF${csvHeader(prepared.columns)}`;
    for (
      let offset = 0;
      offset < Math.min(prepared.total, 1000);
      offset += ReportService.exportBatchSize
    ) {
      const batch = await service.exportRows(
        "delegates",
        { page: 1, limit: 5 },
        offset,
      );
      for (const item of batch) csv += csvRow(prepared.columns, item);
    }
    assert.match(csv, /Registration Reference/);
    assert.doesNotMatch(
      csv,
      /access_code|authorization_url|continuation_token|storage_key|recovery_token|webhook_signature/i,
    );
    console.log(
      JSON.stringify({
        domains: reportDomains.length,
        summaryMatchesPostgres: true,
        csvGenerated: true,
        csvRows: prepared.total,
        auditCreated: true,
      }),
    );
  } finally {
    if (auditId)
      await pool.query("DELETE FROM report_export_audit WHERE id=$1", [
        auditId,
      ]);
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
