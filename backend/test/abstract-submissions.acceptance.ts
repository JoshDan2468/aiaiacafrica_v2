import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { postgresAdminOverviewRepository } from "../src/repositories/adminOverview.repository";
import { postgresAbstractSubmissionRepository } from "../src/repositories/abstractSubmission.repository";
import { AbstractSubmissionService } from "../src/services/abstractSubmission.service";

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool)
    throw new Error("DATABASE_URL is required for Abstract acceptance");
  const messages: TransactionalEmail[] = [];
  const emailProvider: EmailProvider = {
    async send(message) {
      messages.push(message);
    },
  };
  const service = new AbstractSubmissionService(
    postgresAbstractSubmissionRepository,
    new EmailService(emailProvider, "http://localhost:5173"),
    new Date("2027-03-15T22:59:59.000Z"),
  );
  const suffix = randomBytes(4).toString("hex");
  const key = randomBytes(32).toString("base64url");
  let reference: string | null = null;
  let concurrentReference: string | null = null;
  let failedDeliveryReference: string | null = null;
  const scalar = async (sql: string) => {
    const result = await pool.query<{ value: string }>(sql);
    return result.rows[0]?.value ?? "0";
  };
  try {
    const admin = await pool.query<{ id: string }>(
      "SELECT id FROM admins WHERE is_active=true ORDER BY created_at ASC LIMIT 1",
    );
    const adminId = admin.rows[0]?.id;
    if (!adminId)
      throw new Error("An active Admin is required for Abstract acceptance");
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
      idempotencyKey: key,
      authorFirstName: "Synthetic",
      authorLastName: "Author",
      authorEmail: `abstract-${suffix}@example.com`,
      authorPhone: "+2348000000000",
      organizationName: "Acceptance Institution",
      country: "Nigeria",
      title: `Integrity research ${suffix}`,
      abstractBody:
        "This synthetic abstract validates the complete programme review workflow without payment.",
      consent: true as const,
    };
    const created = await service.create(input);
    reference = created.reference;
    assert.equal(created.status, "SUBMITTED");
    assert.equal(created.wordCount, 11);
    const duplicate = await service.create(input);
    assert.equal(duplicate.reference, reference);
    assert.equal(duplicate.created, false);
    const auth = await service.authorize(reference, key);
    assert.equal((await service.getWorkspace(auth))?.status, "SUBMITTED");
    await assert.rejects(() =>
      service.updateRevision(auth, {
        title: input.title,
        abstractBody: "An unauthorized early revision should not be saved.",
      }),
    );
    const queue = await service.list({
      page: 1,
      pageSize: 20,
      search: suffix,
      status: "SUBMITTED",
    });
    assert.equal(
      queue.items.some((item) => item.reference === reference),
      true,
    );
    await service.review(reference, "REVIEW_STARTED", adminId, null, null);
    await service.review(
      reference,
      "REVISION_REQUIRED",
      adminId,
      "Please provide a clearer methodology and findings.",
      null,
    );
    await service.updateRevision(auth, {
      title: `Revised integrity research ${suffix}`,
      abstractBody:
        "This revised synthetic abstract explains the methodology, observed findings, and practical integrity implications.",
    });
    assert.equal((await service.getWorkspace(auth))?.wordCount, 13);
    await service.resubmit(auth);
    await assert.rejects(() => service.resubmit(auth));
    await service.review(reference, "REVIEW_STARTED", adminId, null, null);
    await service.review(
      reference,
      "ACCEPTED",
      adminId,
      null,
      "Synthetic acceptance check.",
    );
    const detail = await service.getAdminDetail(reference);
    assert.equal(detail?.status, "ACCEPTED");
    assert.deepEqual(
      detail?.history.map((item) => item.action),
      [
        "SUBMITTED",
        "REVIEW_STARTED",
        "REVISION_REQUIRED",
        "RESUBMITTED",
        "REVIEW_STARTED",
        "ACCEPTED",
      ],
    );
    assert.equal(
      detail?.history[2]?.authorVisibleReason,
      "Please provide a clearer methodology and findings.",
    );
    assert.equal(detail?.history[5]?.reviewerName !== null, true);
    const counts = await pool.query<{
      notifications: string;
      events: string;
      submissions: string;
    }>(
      `SELECT
       (SELECT count(*)::text FROM abstract_notifications n JOIN abstract_submissions a ON a.id=n.abstract_submission_id WHERE a.reference=$1) AS notifications,
       (SELECT count(*)::text FROM abstract_events e JOIN abstract_submissions a ON a.id=e.abstract_submission_id WHERE a.reference=$1) AS events,
       (SELECT count(*)::text FROM abstract_submissions WHERE reference=$1) AS submissions`,
      [reference],
    );
    assert.equal(counts.rows[0]?.submissions, "1");
    assert.equal(counts.rows[0]?.notifications, "4");
    assert.ok(Number(counts.rows[0]?.events) >= 10);
    assert.equal(
      messages.filter((message) => message.toEmail === input.authorEmail)
        .length,
      4,
    );
    assert.match(
      messages.find((message) => /revision required/i.test(message.subject))
        ?.text ?? "",
      /Please provide a clearer methodology and findings/,
    );
    assert.doesNotMatch(
      messages.find((message) => message.text.includes("has been accepted"))
        ?.text ?? "",
      /payment is available|Event Pass issued/i,
    );

    await service.requestRecovery(reference, input.authorEmail);
    const recoveryEmail = [...messages]
      .reverse()
      .find((message) => message.subject.includes("Restore access"));
    assert.ok(recoveryEmail);
    const recoveryToken = recoveryEmail.text.match(
      /recoveryToken=([A-Za-z0-9_-]{43})/,
    )?.[1];
    assert.ok(recoveryToken);
    const storedRecovery = await pool.query<{ token_hash: string }>(
      `SELECT token_hash FROM abstract_recovery_tokens t
       JOIN abstract_submissions a ON a.id=t.abstract_submission_id
       WHERE a.reference=$1 AND t.consumed_at IS NULL AND t.invalidated_at IS NULL`,
      [reference],
    );
    assert.equal(storedRecovery.rows.length, 1);
    assert.notEqual(storedRecovery.rows[0]?.token_hash, recoveryToken);
    const restored = await service.exchangeRecovery(recoveryToken);
    assert.equal(restored.reference, reference);
    await assert.rejects(() => service.exchangeRecovery(recoveryToken));
    await assert.rejects(() => service.authorize(reference!, key));
    assert.equal(
      (await service.authorize(reference, restored.continuationToken)).id,
      auth.id,
    );

    const overviewAfter = await postgresAdminOverviewRepository.getOverview();
    assert.equal(
      overviewAfter.metrics.abstractSubmissions,
      overviewBefore.metrics.abstractSubmissions + 1,
    );
    assert.equal(
      overviewAfter.metrics.acceptedAbstracts,
      overviewBefore.metrics.acceptedAbstracts + 1,
    );
    assert.deepEqual(
      overviewAfter.metrics.confirmedRevenue,
      overviewBefore.metrics.confirmedRevenue,
    );
    const after = {
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
    assert.deepEqual(after, before);
    const concurrent = await service.create({
      ...input,
      idempotencyKey: randomBytes(32).toString("base64url"),
      title: `Concurrent decision ${suffix}`,
      abstractBody:
        "This distinct synthetic abstract verifies that conflicting review decisions cannot both commit.",
    });
    concurrentReference = concurrent.reference;
    await assert.rejects(() =>
      service.authorize(concurrent.reference, restored.continuationToken),
    );
    await service.review(
      concurrent.reference,
      "REVIEW_STARTED",
      adminId,
      null,
      null,
    );
    const decisions = await Promise.allSettled([
      service.review(concurrent.reference, "ACCEPTED", adminId, null, null),
      service.review(
        concurrent.reference,
        "REJECTED",
        adminId,
        "The methodology is not sufficiently supported.",
        null,
      ),
    ]);
    assert.equal(
      decisions.filter((decision) => decision.status === "fulfilled").length,
      1,
    );
    assert.equal(
      decisions.filter((decision) => decision.status === "rejected").length,
      1,
    );
    const concurrentDetail = await service.getAdminDetail(concurrent.reference);
    assert.equal(concurrentDetail?.history.length, 3);
    const failedService = new AbstractSubmissionService(
      postgresAbstractSubmissionRepository,
      new EmailService(
        {
          async send() {
            throw new Error("Synthetic mail outage");
          },
        },
        "http://localhost:5173",
      ),
      new Date("2027-03-15T22:59:59.000Z"),
    );
    const failedDelivery = await failedService.create({
      ...input,
      idempotencyKey: randomBytes(32).toString("base64url"),
      title: `Failed delivery ${suffix}`,
      abstractBody:
        "This distinct synthetic abstract verifies that email failure does not undo an accepted submission.",
    });
    failedDeliveryReference = failedDelivery.reference;
    assert.equal(failedDelivery.status, "SUBMITTED");
    const failure = await pool.query<{ status: string; attempts: number }>(
      `SELECT n.status, n.attempts FROM abstract_notifications n
       JOIN abstract_submissions a ON a.id=n.abstract_submission_id WHERE a.reference=$1`,
      [failedDelivery.reference],
    );
    assert.equal(failure.rows[0]?.status, "FAILED");
    assert.equal(Number(failure.rows[0]?.attempts), 1);
    assert.equal(await service.retryNotifications(failedDelivery.reference), 1);
    assert.equal(await service.retryNotifications(failedDelivery.reference), 0);
    const recoveredNotification = await pool.query<{
      status: string;
      attempts: number;
    }>(
      `SELECT n.status, n.attempts FROM abstract_notifications n
       JOIN abstract_submissions a ON a.id=n.abstract_submission_id WHERE a.reference=$1`,
      [failedDelivery.reference],
    );
    assert.equal(recoveredNotification.rows[0]?.status, "SENT");
    assert.equal(Number(recoveredNotification.rows[0]?.attempts), 2);
    assert.deepEqual(
      {
        payments: await scalar("SELECT count(*)::text AS value FROM payment_transactions"),
        passes: await scalar("SELECT count(*)::text AS value FROM delegate_event_passes"),
        revenue: await scalar("SELECT COALESCE(sum(amount_minor),0)::text AS value FROM payment_transactions WHERE status='PAID'"),
      },
      before,
    );
    console.log(
      JSON.stringify({
        reference,
        history: detail?.history.length,
        notifications: counts.rows[0]?.notifications,
        events: counts.rows[0]?.events,
        recoverySingleUse: true,
        concurrentDecisionSingleWinner: true,
        notificationFailureRetried: true,
        overviewFromPostgres: true,
        paymentPassRevenueUnchanged: true,
      }),
    );
  } finally {
    if (reference)
      await pool.query("DELETE FROM abstract_submissions WHERE reference=$1", [
        reference,
      ]);
    if (concurrentReference)
      await pool.query("DELETE FROM abstract_submissions WHERE reference=$1", [
        concurrentReference,
      ]);
    if (failedDeliveryReference)
      await pool.query("DELETE FROM abstract_submissions WHERE reference=$1", [
        failedDeliveryReference,
      ]);
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
