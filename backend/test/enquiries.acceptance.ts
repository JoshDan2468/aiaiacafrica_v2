import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { postgresAdminOverviewRepository } from "../src/repositories/adminOverview.repository";
import { postgresEnquiryRepository } from "../src/repositories/enquiry.repository";
import { EnquiryService } from "../src/services/enquiry.service";
import type { EnquiryNotificationRole } from "../src/types/enquiry";

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_URL is required for enquiry acceptance");
  const suffix = randomBytes(4).toString("hex");
  const messages: TransactionalEmail[] = [];
  let failAcknowledgement = true;
  const provider: EmailProvider = {
    async send(message) {
      if (
        failAcknowledgement &&
        message.toEmail === `enquiry-${suffix}@example.com`
      ) {
        failAcknowledgement = false;
        throw new Error("Synthetic one-time email outage");
      }
      messages.push(message);
    },
  };
  const references: string[] = [];
  const scalar = async (sql: string) =>
    (await pool.query<{ value: string }>(sql)).rows[0]?.value ?? "0";
  try {
    const admins = await pool.query<{
      id: string;
      role: EnquiryNotificationRole;
    }>(
      `SELECT id,role FROM admins WHERE is_active=true
       AND role IN ('SUPER_ADMIN','ADMIN','REGISTRATION_MANAGER','COMMUNICATIONS')
       ORDER BY created_at ASC LIMIT 1`,
    );
    const admin = admins.rows[0];
    if (!admin)
      throw new Error(
        "An active operational Admin is required for enquiry acceptance",
      );
    const service = new EnquiryService(
      postgresEnquiryRepository,
      new EmailService(provider, "http://localhost:5173"),
      [admin.role],
    );
    const before = {
      payments: await scalar(
        "SELECT count(*)::text AS value FROM payment_transactions",
      ),
      passes: await scalar(
        "SELECT count(*)::text AS value FROM delegate_event_passes",
      ),
      revenue: await scalar(
        "SELECT COALESCE(sum(amount_minor),0)::text AS value FROM payment_transactions WHERE status='PAID'",
      ),
    };
    const overviewBefore = await postgresAdminOverviewRepository.getOverview();
    const input = {
      idempotencyKey: randomBytes(32).toString("base64url"),
      firstName: "Synthetic",
      lastName: "Enquirer",
      email: `enquiry-${suffix}@example.com`,
      phone: "+2348000000000",
      organization: "Acceptance Organisation",
      country: "Nigeria",
      category: "GENERAL" as const,
      subject: `Conference question ${suffix}`,
      message:
        "This synthetic enquiry verifies PostgreSQL persistence, Admin review, and notification retry.",
    };
    const created = await service.create(input);
    references.push(created.reference);
    assert.equal(created.created, true);
    assert.equal(created.status, "OPEN");
    const overviewDuring = await postgresAdminOverviewRepository.getOverview();
    assert.equal(
      overviewDuring.metrics.openEnquiries,
      overviewBefore.metrics.openEnquiries + 1,
    );
    const stored = await pool.query<{
      submission_key_hash: string;
      payload_fingerprint: string;
    }>(
      "SELECT submission_key_hash,payload_fingerprint FROM enquiries WHERE reference=$1",
      [created.reference],
    );
    assert.equal(stored.rows.length, 1);
    assert.notEqual(stored.rows[0]?.submission_key_hash, input.idempotencyKey);
    assert.match(stored.rows[0]?.submission_key_hash ?? "", /^[0-9a-f]{64}$/);
    const queue = await service.list({
      page: 1,
      pageSize: 20,
      search: suffix,
      category: "GENERAL",
      status: "OPEN",
    });
    assert.equal(
      queue.items.some((item) => item.reference === created.reference),
      true,
    );
    const failed = await pool.query<{ status: string; attempts: number }>(
      `SELECT n.status,n.attempts FROM enquiry_notifications n JOIN enquiries e ON e.id=n.enquiry_id
       WHERE e.reference=$1 AND recipient_kind='ACKNOWLEDGEMENT'`,
      [created.reference],
    );
    assert.equal(failed.rows[0]?.status, "FAILED");
    assert.equal(Number(failed.rows[0]?.attempts), 1);
    assert.equal(await service.retryNotifications(created.reference), 1);
    assert.equal(await service.retryNotifications(created.reference), 0);
    const duplicate = await service.create(input);
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.reference, created.reference);
    assert.equal(
      messages.filter((item) => item.toEmail === input.email).length,
      1,
    );
    const acknowledgement = messages.find(
      (item) => item.toEmail === input.email,
    );
    assert.match(acknowledgement?.text ?? "", /AIAIAC 2027/);
    assert.match(acknowledgement?.text ?? "", new RegExp(created.reference));
    const notifications = await pool.query<{
      recipient_kind: string;
      status: string;
      attempts: number;
    }>(
      `SELECT n.recipient_kind,n.status,n.attempts FROM enquiry_notifications n
       JOIN enquiries e ON e.id=n.enquiry_id WHERE e.reference=$1`,
      [created.reference],
    );
    assert.equal(
      notifications.rows.filter(
        (item) => item.recipient_kind === "ACKNOWLEDGEMENT",
      ).length,
      1,
    );
    assert.ok(
      notifications.rows.some(
        (item) => item.recipient_kind === "INTERNAL" && item.status === "SENT",
      ),
    );
    assert.ok(
      messages.some(
        (item) =>
          item.toEmail !== input.email && item.text.includes(created.reference),
      ),
    );
    assert.equal(
      notifications.rows.find(
        (item) => item.recipient_kind === "ACKNOWLEDGEMENT",
      )?.attempts,
      2,
    );
    await service.transition(
      created.reference,
      "IN_PROGRESS",
      admin.id,
      "Assigned for follow-up.",
    );
    await service.transition(
      created.reference,
      "RESOLVED",
      admin.id,
      "Answered by the team.",
    );
    await assert.rejects(() =>
      service.transition(created.reference, "RESOLVED", admin.id, null),
    );
    await service.transition(created.reference, "CLOSED", admin.id, null);
    const detail = await service.getDetail(created.reference);
    assert.equal(detail?.status, "CLOSED");
    assert.deepEqual(
      detail?.history.map((item) => item.action),
      ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "CLOSED"],
    );
    assert.equal(detail?.history[1]?.internalNote, "Assigned for follow-up.");
    const another = await service.create({
      ...input,
      idempotencyKey: randomBytes(32).toString("base64url"),
      subject: `Different question ${suffix}`,
    });
    references.push(another.reference);
    assert.equal(another.created, true);
    assert.notEqual(another.reference, created.reference);
    const decisions = await Promise.allSettled([
      service.transition(another.reference, "RESOLVED", admin.id, null),
      service.transition(another.reference, "RESOLVED", admin.id, null),
    ]);
    assert.equal(
      decisions.filter((item) => item.status === "fulfilled").length,
      1,
    );
    assert.equal(
      decisions.filter((item) => item.status === "rejected").length,
      1,
    );
    const overviewAfter = await postgresAdminOverviewRepository.getOverview();
    assert.equal(
      overviewAfter.metrics.openEnquiries,
      overviewBefore.metrics.openEnquiries,
    );
    assert.deepEqual(
      overviewAfter.metrics.confirmedRevenue,
      overviewBefore.metrics.confirmedRevenue,
    );
    assert.deepEqual(
      {
        payments: await scalar(
          "SELECT count(*)::text AS value FROM payment_transactions",
        ),
        passes: await scalar(
          "SELECT count(*)::text AS value FROM delegate_event_passes",
        ),
        revenue: await scalar(
          "SELECT COALESCE(sum(amount_minor),0)::text AS value FROM payment_transactions WHERE status='PAID'",
        ),
      },
      before,
    );
    console.log(
      JSON.stringify({
        created: references.length,
        history: detail?.history.length,
        notificationRows: notifications.rows.length,
        acknowledgementRetries: 2,
        duplicateAcknowledgements: 0,
        concurrentDecisionSingleWinner: true,
        overviewFromPostgres: true,
        paymentPassRevenueUnchanged: true,
      }),
    );
  } finally {
    for (const reference of references) {
      await pool.query("DELETE FROM enquiries WHERE reference=$1", [reference]);
    }
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
