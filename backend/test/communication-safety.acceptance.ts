import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { postgresCommunicationRepository as repository } from "../src/repositories/communication.repository";
import { communicationPreferences as preferences } from "../src/repositories/communicationPreference.repository";
import { postgresAdminAuditRepository as audits } from "../src/repositories/adminAudit.repository";
import { postgresContactRepository } from "../src/repositories/contact.repository";
import { ContactService } from "../src/services/contact.service";
import { CommunicationService } from "../src/services/communication.service";
import { EmailService } from "../src/email/email.service";
import type { TransactionalEmail } from "../src/email/email.types";
import type { CommunicationContent } from "../src/types/communication";

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (
    target.hostname !== "127.0.0.1" ||
    target.port !== "15440" ||
    target.pathname !== "/communications_fixture"
  )
    throw new Error("Only isolated local fixture database permitted");
  const pool = getDatabasePool()!;
  await pool.query(
    "TRUNCATE communication_campaigns,communication_deliveries,communication_preferences,communication_manual_contacts,communication_send_windows",
  );
  const adminId = "00000000-0000-4000-8000-000000000001";
  const messages: TransactionalEmail[] = [];
  const uuids = new Map<string, string>();
  const service = new CommunicationService(
    repository,
    new EmailService(
      {
        async send(message) {
          messages.push(message);
          const uuid = randomUUID();
          uuids.set(message.toEmail, uuid);
          return {
            provider: "MAILJET",
            status: "accepted",
            messageId: "synthetic-message",
            messageUuid: uuid,
          };
        },
      },
      "https://example.invalid",
    ),
    audits,
    true,
    undefined,
    {
      publicApiUrl: "https://api.example.invalid",
      secret: "synthetic-only-32-character-signing-secret",
      preferences,
    },
  );
  const contacts = new ContactService(postgresContactRepository, audits);
  const marker = randomUUID().slice(0, 8);
  const emails = Array.from(
    { length: 35 },
    (_, i) => `fixture-${i}-${marker}@example.invalid`,
  );
  const imported = await contacts.importCsv(
    "name,email,consent,consent_evidence,source\n" +
      emails
        .map(
          (email, i) =>
            `Fixture ${i},${email},OPTED_IN,Synthetic test opt-in,Local fixture`,
        )
        .join("\n"),
    adminId,
  );
  assert.equal(imported.imported, 35);
  const unknown = `unknown-${marker}@example.invalid`;
  await contacts.add({ name: "Unknown", email: unknown }, adminId);
  const suppression = `suppressed-${marker}@example.invalid`;
  await preferences.set(
    {
      email: suppression,
      suppressed: true,
      reason: "Synthetic previous opt-out",
    },
    adminId,
    async () => {},
  );
  const suppressedContact = await contacts.add(
    {
      name: "Suppressed",
      email: suppression,
      consent: "OPTED_IN",
      consentEvidence: "Synthetic import evidence",
    },
    adminId,
  );
  assert.equal(suppressedContact.suppressed, true);
  assert.equal(suppressedContact.consent, "UNKNOWN");
  const content: CommunicationContent = {
    purpose: "MARKETING",
    title: "Fixture campaign",
    subject: "Fixture campaign",
    preheader: "No real delivery",
    heading: "Local fixture",
    body: "Local fixture recording provider only.",
    audience: { code: "APPROVED_CONTACTS" },
  };
  const audience = await service.audience(content.audience);
  assert.equal(audience.count, 35);
  assert.ok(
    !audience.recipients.some(
      (row) => row.email === unknown || row.email === suppression,
    ),
  );
  const draft = await service.create(content, adminId);
  const updated = await service.update(
    draft.reference,
    { ...content, subject: "Updated fixture" },
    adminId,
  );
  await assert.rejects(
    service.confirm(
      draft.reference,
      audience.fingerprint,
      adminId,
      draft.revision,
    ),
  );
  assert.equal((await service.get(draft.reference)).status, "DRAFT");
  assert.equal(
    (await repository.deliveries(1, undefined, draft.reference)).total,
    0,
  );
  const concurrent = await Promise.allSettled([
    service.confirm(
      draft.reference,
      audience.fingerprint,
      adminId,
      updated.revision,
    ),
    service.confirm(
      draft.reference,
      audience.fingerprint,
      adminId,
      updated.revision,
    ),
  ]);
  assert.equal(
    concurrent.filter((item) => item.status === "fulfilled").length,
    1,
  );
  assert.equal(
    (await repository.deliveries(1, undefined, draft.reference)).total,
    35,
  );
  // Suppress after confirmation: the snapshot alone must never authorize a stale send.
  await preferences.unsubscribe(emails[0]!, draft.reference);
  await preferences.unsubscribe(emails[0]!, draft.reference);
  const earlyDelivery = (
    await pool.query(
      "SELECT id FROM communication_deliveries WHERE campaign_id=$1 AND recipient_email=$2",
      [draft.id, emails[1]],
    )
  ).rows[0];
  await preferences.providerEvent(randomUUID(), "DELIVERED", earlyDelivery.id);
  await pool.query("DELETE FROM communication_send_windows");
  await Promise.all([
    service.deliver(draft.reference, false, adminId),
    service.deliver(draft.reference, false, adminId),
  ]);
  await service.deliver(draft.reference, false, adminId);
  assert.equal(
    (await service.deliver(draft.reference, false, adminId)).processed,
    0,
  );
  assert.ok(messages.length >= 29 && messages.length <= 30);
  assert.ok(
    messages.every((message) =>
      message.unsubscribeUrl?.startsWith(
        "https://api.example.invalid/api/communications/unsubscribe?token=",
      ),
    ),
  );
  assert.equal(
    new Set(messages.map((message) => message.toEmail)).size,
    messages.length,
  );

  assert.equal(
    Number(
      (
        await pool.query(
          "SELECT sum(used) AS total FROM communication_send_windows",
        )
      ).rows[0].total,
    ),
    30,
  );
  await pool.query("DELETE FROM communication_send_windows");
  await service.deliver(draft.reference, false, adminId);
  assert.equal(messages.length, 34);
  assert.equal((await service.get(draft.reference)).skipped, 1);
  assert.equal((await service.get(draft.reference)).status, "SENT");
  assert.equal(
    (
      await pool.query(
        "SELECT provider_status FROM communication_deliveries WHERE id=$1",
        [earlyDelivery.id],
      )
    ).rows[0].provider_status,
    "DELIVERED",
  );
  const delivered = messages[0]!;
  const uuid = uuids.get(delivered.toEmail)!;
  await preferences.providerEvent(uuid, "DELIVERED");
  await preferences.providerEvent(uuid, "CLICKED");
  await preferences.providerEvent(uuid, "BOUNCED");
  await preferences.providerEvent(uuid, "DELIVERED");
  assert.equal(
    (
      await pool.query(
        "SELECT provider_status FROM communication_deliveries WHERE provider_message_uuid=$1",
        [uuid],
      )
    ).rows[0].provider_status,
    "BOUNCED",
  );
  assert.equal(
    (
      await pool.query(
        "SELECT suppressed FROM communication_preferences WHERE email=$1",
        [delivered.toEmail],
      )
    ).rows[0].suppressed,
    true,
  );
  const fresh = await service.audience(content.audience);
  assert.equal(fresh.count, 33);
  const scheduled = await service.create(content, adminId);
  await service.confirm(
    scheduled.reference,
    fresh.fingerprint,
    adminId,
    scheduled.revision,
    new Date(Date.now() + 120000).toISOString(),
  );
  await assert.rejects(service.deliver(scheduled.reference, false, adminId));
  assert.equal(
    (await service.cancel(scheduled.reference, adminId)).status,
    "CANCELLED",
  );
  await assert.rejects(service.cancel(scheduled.reference, adminId));
  const due = await service.create(content, adminId);
  await service.confirm(
    due.reference,
    fresh.fingerprint,
    adminId,
    due.revision,
    new Date(Date.now() + 120000).toISOString(),
  );
  await pool.query(
    "UPDATE communication_campaigns SET scheduled_at=now()-interval '1 minute' WHERE reference=$1",
    [due.reference],
  );
  await pool.query("UPDATE admins SET is_active=false WHERE id=$1", [adminId]);
  const before = messages.length;
  await service.runDue();
  assert.equal(messages.length, before);
  await pool.query("UPDATE admins SET is_active=true WHERE id=$1", [adminId]);
  await service.runDue();
  assert.ok(messages.length > before);
  // A crashed claim becomes uncertain; only PENDING/definitely FAILED rows may be reclaimed.
  await pool.query(
    "UPDATE communication_deliveries SET status='CLAIMED',claimed_at=now()-interval '20 minutes' WHERE id=(SELECT id FROM communication_deliveries WHERE campaign_id=$1 AND status='PENDING' LIMIT 1)",
    [due.id],
  );
  await repository.due();
  assert.ok((await service.get(due.reference)).uncertain! > 0);
  const audit = await pool.query(
    "SELECT action FROM admin_audit_logs WHERE action IN ('CONTACT_IMPORTED','CAMPAIGN_SCHEDULED','CAMPAIGN_CANCELLED')",
  );
  assert.ok(audit.rows.length >= 3);
  console.log(
    "Communications safety PostgreSQL acceptance PASS: consent-aware imports; opt-out preservation; revision/concurrent confirmation; duplicate prevention; 30/min shared limit; late unsubscribe; event reporting/suppression; schedule/cancel; revoked staff; interrupted claims; audit records. All email sends recorded locally.",
  );
  await closeDatabasePool();
}
main().catch(async (error) => {
  console.error(error);
  await closeDatabasePool();
  process.exitCode = 1;
});
