/** P0.9 PostgreSQL acceptance; synthetic local data only, no Paystack/email calls. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { createEventPassCredential } from "../src/eventPass/eventPassCredential";
import { postgresAdminAuditRepository } from "../src/repositories/adminAudit.repository";
import { createPostgresCheckInRepository } from "../src/repositories/checkIn.repository";
import { postgresPaymentRepository } from "../src/repositories/payment.repository";
import { CheckInService } from "../src/services/checkIn.service";
import { createSyntheticCheckInFixtures } from "./check-in.fixtures";

async function main() {
  const fixtures = await createSyntheticCheckInFixtures();
  const pool = getDatabasePool();
  assert.ok(pool);
  const now = new Date("2027-04-19T09:00:00.000Z");
  const service = new CheckInService(
    createPostgresCheckInRepository(),
    postgresAdminAuditRepository,
    () => now,
  );
  const staff = fixtures.adminIds[0]!;
  const otherStaff = fixtures.adminIds[1]!;
  const attendees = fixtures.attendees;
  const checkedKeys = [
    "professional",
    "student",
    "bankTransfer",
    "offline",
    "concurrent",
    "duplicateSuccess",
  ];
  const safeResults: unknown[] = [];

  try {
    const financialSnapshot = async () => {
      const registrations = await pool.query(
        "SELECT * FROM delegate_registrations WHERE id=ANY($1::uuid[]) ORDER BY id",
        [fixtures.registrationIds],
      );
      const payments = await pool.query(
        "SELECT * FROM payment_transactions WHERE registration_id=ANY($1::uuid[]) ORDER BY id",
        [fixtures.registrationIds],
      );
      const totals = await pool.query(
        `SELECT currency,sum(amount_minor)::text AS revenue FROM payment_transactions
         WHERE registration_id=ANY($1::uuid[]) AND status='PAID' AND financial_authority='AUTHORITATIVE'
         GROUP BY currency ORDER BY currency`,
        [fixtures.registrationIds],
      );
      const passes = await pool.query(
        "SELECT id,registration_id,credential_hash,status FROM delegate_event_passes WHERE registration_id=ANY($1::uuid[]) ORDER BY id",
        [fixtures.registrationIds],
      );
      return JSON.stringify({
        registrations: registrations.rows,
        payments: payments.rows,
        revenue: totals.rows,
        passes: passes.rows,
      });
    };
    const before = await financialSnapshot();
    const baseline = await service.count();

    for (const key of [
      "professional",
      "student",
      "bankTransfer",
      "offline",
      "duplicateSuccess",
    ]) {
      const attendee = attendees[key]!;
      const result = await service.validate(attendee.credential, staff);
      safeResults.push(result);
      assert.equal(result.status, "VALID_ACTIVE_PASS", `${key} pass validates`);
      assert.equal(
        result.attendee?.registrationReference,
        attendee.registrationReference,
      );
    }
    const professional = attendees.professional!;
    assert.equal(
      (await service.validate(createEventPassCredential().raw, staff)).status,
      "INVALID_PASS",
    );
    const modified = `${professional.credential.slice(0, -1)}${professional.credential.endsWith("A") ? "B" : "A"}`;
    assert.equal(
      (await service.validate(modified, staff)).status,
      "INVALID_PASS",
    );

    for (const [key, expected] of [
      ["revoked", "INACTIVE_PASS"],
      ["unpaid", "REGISTRATION_NOT_ELIGIBLE"],
      ["unapprovedStudent", "REGISTRATION_NOT_ELIGIBLE"],
      ["unverified", "REGISTRATION_NOT_ELIGIBLE"],
      ["cancelled", "REGISTRATION_NOT_ELIGIBLE"],
      ["missingAuthority", "REGISTRATION_NOT_ELIGIBLE"],
      ["reconciliation", "RECONCILIATION_REQUIRED"],
    ] as const) {
      const attendee = attendees[key]!;
      assert.equal(
        (await service.validate(attendee.credential, staff)).status,
        expected,
        key,
      );
      assert.equal(
        (
          await service.confirm(
            { method: "QR", credential: attendee.credential },
            staff,
          )
        ).status,
        expected,
        `${key} QR confirmation denied`,
      );
      assert.equal(
        (
          await service.confirm(
            {
              method: "MANUAL_LOOKUP",
              registrationReference: attendee.registrationReference,
            },
            staff,
          )
        ).status,
        expected,
        `${key} manual confirmation denied`,
      );
    }

    const lookupByReference = await service.lookup(
      professional.registrationReference.toLowerCase(),
      staff,
    );
    assert.equal(
      lookupByReference.matches[0]?.attendee?.registrationReference,
      professional.registrationReference,
    );
    const lookupByEmail = await service.lookup(
      professional.email.toUpperCase(),
      staff,
    );
    assert.equal(
      lookupByEmail.matches[0]?.attendee?.registrationReference,
      professional.registrationReference,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT 1 FROM delegate_check_ins WHERE registration_id=ANY($1::uuid[])",
          [fixtures.registrationIds],
        )
      ).rowCount,
      0,
      "lookup and validation never admit attendees",
    );
    safeResults.push(lookupByReference, lookupByEmail);

    const first = await service.confirm(
      { method: "QR", credential: professional.credential },
      staff,
    );
    assert.equal(first.status, "CHECKED_IN");
    assert.equal(first.checkedInAt?.toISOString(), now.toISOString());
    const second = await service.validate(professional.credential, otherStaff);
    assert.equal(second.status, "ALREADY_CHECKED_IN");
    assert.equal(
      second.checkedInAt?.toISOString(),
      first.checkedInAt?.toISOString(),
    );
    const repeats = await Promise.all(
      Array.from({ length: 6 }, () =>
        service.confirm(
          { method: "QR", credential: professional.credential },
          otherStaff,
        ),
      ),
    );
    assert.ok(
      repeats.every((result) => result.status === "ALREADY_CHECKED_IN"),
    );

    const concurrent = attendees.concurrent!;
    const raced = await Promise.all([
      service.confirm(
        { method: "QR", credential: concurrent.credential },
        staff,
      ),
      service.confirm(
        {
          method: "MANUAL_LOOKUP",
          registrationReference: concurrent.registrationReference,
        },
        otherStaff,
      ),
    ]);
    assert.equal(
      raced.filter((result) => result.status === "CHECKED_IN").length,
      1,
    );
    assert.equal(
      raced.filter((result) => result.status === "ALREADY_CHECKED_IN").length,
      1,
    );
    assert.equal(
      raced[0]?.checkedInAt?.toISOString(),
      raced[1]?.checkedInAt?.toISOString(),
    );
    assert.equal(
      (
        await pool.query(
          "SELECT 1 FROM delegate_check_ins WHERE event_pass_id=$1",
          [concurrent.eventPassId],
        )
      ).rowCount,
      1,
    );

    for (const key of [
      "student",
      "bankTransfer",
      "offline",
      "duplicateSuccess",
    ]) {
      const attendee = attendees[key]!;
      const result = await service.confirm(
        {
          method: "MANUAL_LOOKUP",
          registrationReference: attendee.registrationReference,
        },
        staff,
      );
      assert.equal(
        result.status,
        "CHECKED_IN",
        `${key} manual admission succeeds`,
      );
      safeResults.push(result);
    }
    const recorded = await pool.query<{
      registration_id: string;
      method: string;
      checked_in_by_admin_id: string;
    }>(
      "SELECT registration_id,method,checked_in_by_admin_id FROM delegate_check_ins WHERE registration_id=ANY($1::uuid[])",
      [fixtures.registrationIds],
    );
    assert.equal(recorded.rows.length, checkedKeys.length);
    assert.equal(
      recorded.rows.find(
        (row) => row.registration_id === professional.registrationId,
      )?.method,
      "QR",
    );
    assert.equal(
      recorded.rows.find(
        (row) => row.registration_id === attendees.bankTransfer!.registrationId,
      )?.method,
      "MANUAL_LOOKUP",
    );
    assert.ok(
      recorded.rows.every((row) =>
        fixtures.adminIds.includes(row.checked_in_by_admin_id),
      ),
    );
    const repeatedPassIds = await pool.query(
      "SELECT event_pass_id FROM delegate_check_ins WHERE registration_id=ANY($1::uuid[]) GROUP BY event_pass_id HAVING count(*)>1",
      [fixtures.registrationIds],
    );
    assert.equal(repeatedPassIds.rows.length, 0);
    await assert.rejects(
      () =>
        pool.query(
          `INSERT INTO delegate_check_ins (id,event_pass_id,registration_id,checked_in_at,checked_in_by_admin_id,method)
       VALUES ($1,$2,$3,$4,$5,'QR')`,
          [
            randomUUID(),
            professional.eventPassId,
            professional.registrationId,
            now,
            staff,
          ],
        ),
      (error: unknown) => (error as { code?: string }).code === "23505",
      "database uniqueness independently rejects duplicate admission",
    );

    const freshService = new CheckInService(
      createPostgresCheckInRepository(),
      postgresAdminAuditRepository,
      () => now,
    );
    const count = await freshService.count();
    assert.equal(count.today - baseline.today, checkedKeys.length);
    assert.ok(count.total >= baseline.total + checkedKeys.length);
    const recent = await freshService.recent(50);
    assert.ok(recent.items.length <= 50);
    for (const key of checkedKeys) {
      const item = recent.items.find(
        (row) =>
          row.registrationReference === attendees[key]!.registrationReference,
      );
      assert.ok(
        item,
        `${key} read from PostgreSQL recent list by a fresh service instance`,
      );
      assert.ok(item.staffName.startsWith("P0.9 Synthetic Staff"));
    }
    assert.equal((await freshService.recent(2)).items.length, 2);
    safeResults.push(first, second, repeats, raced, recent, count);

    const audits = await pool.query<{ action: string; metadata: object }>(
      "SELECT action,metadata FROM admin_audit_logs WHERE admin_id=ANY($1::uuid[])",
      [fixtures.adminIds],
    );
    for (const action of [
      "PASS_VALIDATED",
      "CHECK_IN_CONFIRMED",
      "CHECK_IN_ALREADY_COMPLETED",
      "MANUAL_ATTENDEE_LOOKUP",
      "CHECK_IN_DENIED",
    ]) {
      assert.ok(
        audits.rows.some((row) => row.action === action),
        `${action} audited`,
      );
    }
    const serialized = JSON.stringify({
      results: safeResults,
      audits: audits.rows,
    });
    for (const attendee of Object.values(attendees)) {
      assert.ok(
        !serialized.includes(attendee.credential),
        "raw QR absent from responses/audit",
      );
      assert.ok(
        !serialized.includes(attendee.credentialHash),
        "credential hash absent from responses/audit",
      );
    }
    assert.doesNotMatch(
      serialized,
      /accessCode|authorizationUrl|passwordHash|evidencePath|sessionId/,
    );
    assert.equal(
      await financialSnapshot(),
      before,
      "admission leaves registration/payment/revenue/pass identity and hash intact",
    );

    const duplicate = attendees.duplicateSuccess!;
    const duplicateRow = await pool.query<{ provider_reference: string }>(
      "SELECT provider_reference FROM payment_transactions WHERE registration_id=$1 AND status='DUPLICATE_SUCCESS'",
      [duplicate.registrationId],
    );
    const duplicateReference = duplicateRow.rows[0]!.provider_reference;
    const retriedSuccess =
      await postgresPaymentRepository.finalizeSuccessfulPayment({
        paymentReference: duplicateReference,
        providerReference: duplicateReference,
        providerTransactionId: randomUUID().replaceAll("-", "").slice(0, 24),
        amountMinor: 210000000,
        chargedAmountMinor: 210000000,
        currency: "NGN",
        customerEmail: duplicate.email,
        channel: "synthetic",
        gatewayResponse: "Synthetic success only",
        paidAt: now,
      });
    assert.equal(
      retriedSuccess.kind,
      "duplicate_success",
      "P0.6A still refuses second authoritative success after admission",
    );
    const duplicateIntegrity = await pool.query<{
      authoritative: string;
      passes: string;
      admissions: string;
    }>(
      `SELECT (SELECT count(*) FROM payment_transactions WHERE registration_id=$1 AND financial_authority='AUTHORITATIVE')::text AS authoritative,
        (SELECT count(*) FROM delegate_event_passes WHERE registration_id=$1)::text AS passes,
        (SELECT count(*) FROM delegate_check_ins WHERE registration_id=$1)::text AS admissions`,
      [duplicate.registrationId],
    );
    assert.deepEqual(duplicateIntegrity.rows[0], {
      authoritative: "1",
      passes: "1",
      admissions: "1",
    });
    console.log(
      "P0.9 PostgreSQL acceptance PASS: eligibility, Paystack/BANK_TRANSFER/OFFLINE, safe QR/manual lookup, one concurrent admission, idempotency, audit, unchanged financial state, duplicate-payment protection, recent/count.",
    );
  } finally {
    await fixtures.cleanup();
    const remaining = await pool.query(
      "SELECT id FROM delegate_registrations WHERE id=ANY($1::uuid[])",
      [fixtures.registrationIds],
    );
    assert.equal(remaining.rowCount, 0, "synthetic PostgreSQL rows cleaned");
    await closeDatabasePool();
  }
}

main().catch(async (error: unknown) => {
  console.error("P0.9 synthetic acceptance failed", {
    errorType: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown failure",
  });
  await closeDatabasePool();
  process.exitCode = 1;
});
