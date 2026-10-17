import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { EmailService } from "../src/email/email.service";
import type { TransactionalEmail } from "../src/email/email.types";
import { postgresDelegateRepository } from "../src/repositories/delegate.repository";
import { postgresDelegateRegistrationAcknowledgementRepository } from "../src/repositories/delegateRegistrationAcknowledgement.repository";
import { DelegateService } from "../src/services/delegate.service";
import { DelegateRegistrationAcknowledgementService } from "../src/services/delegateRegistrationAcknowledgement.service";

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool)
    throw new Error("DATABASE_URL required for acknowledgement acceptance");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  const reference = `AIAIAC-DEL-${suffix}`;
  const email = `ack-${suffix.toLowerCase()}@example.com`;
  const messages: TransactionalEmail[] = [];
  const emailService = new EmailService(
    {
      async send(message) {
        messages.push(message);
      },
    },
    "http://localhost:5173",
  );
  const acknowledgement = new DelegateRegistrationAcknowledgementService(
    postgresDelegateRegistrationAcknowledgementRepository,
    emailService,
  );
  let registrationId: string | null = null;
  try {
    const packageRow = await pool.query<{ id: string }>(
      "SELECT id FROM delegate_packages WHERE delegate_type='PROFESSIONAL' AND is_active=true LIMIT 1",
    );
    assert.ok(packageRow.rows[0]);
    const registration = await new DelegateService(
      postgresDelegateRepository,
      () => reference,
      acknowledgement,
    ).createRegistration({
      packageId: packageRow.rows[0].id,
      firstName: "Synthetic",
      lastName: "Delegate",
      email,
      mobile: "+2348000000000",
      jobTitle: "Test",
      companyName: "Example Company",
      country: "Nigeria",
      primaryActivity: "Testing",
      mainObjective: "Verify post-persistence registration acknowledgement",
      heardAboutSource: "Acceptance test",
      privacyConsent: true,
      dataSharingConsent: false,
    });
    registrationId = registration.id;
    await acknowledgement.send(registration.id);
    const ledger = await pool.query<{ status: string; attempts: number }>(
      "SELECT status,attempts FROM delegate_registration_acknowledgements WHERE registration_id=$1",
      [registration.id],
    );
    assert.equal(ledger.rows[0]?.status, "SENT");
    assert.equal(ledger.rows[0]?.attempts, 1);
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.toEmail, email);
    assert.match(
      messages[0]?.text ?? "",
      /Payment (?:has not been|is not) confirmed/,
    );
    assert.equal(messages[0]?.inlineAttachments, undefined);
    const payment = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM payment_transactions WHERE registration_id=$1",
      [registration.id],
    );
    assert.equal(payment.rows[0]?.count, "0");
    console.log(
      JSON.stringify({
        postCommit: true,
        acknowledgementCount: 1,
        ledger: "SENT",
        paymentUnchanged: true,
      }),
    );
  } finally {
    if (registrationId)
      await pool.query("DELETE FROM delegate_registrations WHERE id=$1", [
        registrationId,
      ]);
    await closeDatabasePool();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
