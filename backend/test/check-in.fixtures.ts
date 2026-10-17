/** Synthetic P0.9 fixtures. No provider, email, or production records are used. */
import { randomUUID } from "node:crypto";
import { getDatabasePool } from "../src/config/database";
import { env } from "../src/config/env";
import { createEventPassCredential } from "../src/eventPass/eventPassCredential";

export interface SyntheticCheckInAttendee {
  readonly registrationId: string;
  readonly registrationReference: string;
  readonly email: string;
  readonly eventPassId: string;
  readonly credential: string;
  readonly credentialHash: string;
  readonly paymentId: string | null;
}

export async function createSyntheticCheckInFixtures(
  passwordHash = "synthetic-not-a-login-hash",
) {
  if (
    env.nodeEnv === "production" ||
    !env.databaseUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(env.databaseUrl).hostname,
    )
  ) {
    throw new Error(
      "Check-in fixtures require local non-production PostgreSQL",
    );
  }
  const pool = getDatabasePool();
  if (!pool) throw new Error("DATABASE_URL required");
  const runId = randomUUID();
  const adminIds: string[] = [randomUUID(), randomUUID()];
  const packageIds = [randomUUID(), randomUUID()];
  const registrationIds: string[] = [];
  const adminEmail = `p09-${runId}@example.test`;
  const attendees: Record<string, SyntheticCheckInAttendee> = {};

  const cleanup = async () => {
    await pool.query(
      "DELETE FROM session WHERE sess->>'adminId'=ANY($1::text[])",
      [adminIds],
    );
    await pool.query(
      "DELETE FROM delegate_check_ins WHERE registration_id=ANY($1::uuid[])",
      [registrationIds],
    );
    await pool.query(
      "DELETE FROM admin_audit_logs WHERE admin_id=ANY($1::uuid[])",
      [adminIds],
    );
    await pool.query(
      "DELETE FROM delegate_event_passes WHERE registration_id=ANY($1::uuid[])",
      [registrationIds],
    );
    await pool.query(
      "UPDATE delegate_registrations SET authoritative_payment_transaction_id=NULL WHERE id=ANY($1::uuid[])",
      [registrationIds],
    );
    await pool.query(
      "DELETE FROM payment_transactions WHERE registration_id=ANY($1::uuid[])",
      [registrationIds],
    );
    await pool.query(
      "DELETE FROM delegate_registrations WHERE id=ANY($1::uuid[])",
      [registrationIds],
    );
    await pool.query("DELETE FROM delegate_packages WHERE id=ANY($1::uuid[])", [
      packageIds,
    ]);
    await pool.query("DELETE FROM admins WHERE id=ANY($1::uuid[])", [adminIds]);
  };

  try {
    for (const [index, id] of adminIds.entries()) {
      await pool.query(
        `INSERT INTO admins (id,full_name,email,password_hash,role)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          id,
          `P0.9 Synthetic Staff ${index + 1}`,
          index === 0 ? adminEmail : `p09-${id}@example.test`,
          passwordHash,
          index === 0 ? "SUPER_ADMIN" : "REGISTRATION_MANAGER",
        ],
      );
    }
    for (const [index, id] of packageIds.entries()) {
      await pool.query(
        `INSERT INTO delegate_packages
         (id,slug,name,delegate_type,description,benefits,currency,price_minor,is_active)
         VALUES ($1,$2,$3,$4,'Synthetic check-in acceptance only',ARRAY['Synthetic admission'],'NGN',210000000,true)`,
        [
          id,
          `p09-${id}`,
          `P0.9 ${index === 0 ? "Professional" : "Student"}`,
          index === 0 ? "PROFESSIONAL" : "STUDENT",
        ],
      );
    }

    const definitions = [
      { key: "professional" },
      { key: "student", student: true },
      { key: "bankTransfer", method: "BANK_TRANSFER" },
      { key: "offline", method: "OFFLINE" },
      { key: "unpaid", unpaid: true },
      { key: "revoked", revoked: true },
      { key: "unapprovedStudent", student: true, unapproved: true },
      { key: "reconciliation", reconciliation: true },
      { key: "unverified", unverified: true },
      { key: "cancelled", cancelled: true },
      { key: "duplicateSuccess", duplicate: true },
      { key: "missingAuthority", missingAuthority: true },
      { key: "concurrent" },
    ];
    for (const definition of definitions) {
      const id = randomUUID();
      registrationIds.push(id);
      const reference = `AIAIAC-DEL-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
      const email = `p09-${definition.key.toLowerCase()}-${runId}@example.test`;
      const category = definition.student ? "STUDENT" : "PROFESSIONAL";
      await pool.query(
        `INSERT INTO delegate_registrations
         (id,reference,package_id,first_name,last_name,email,mobile,job_title,company_name,country,
          primary_activity,main_objective,heard_about_source,privacy_consent,data_sharing_consent,
          registration_status,payment_status,package_name_snapshot,package_type_snapshot,
          package_description_snapshot,package_benefits_snapshot,currency_snapshot,price_minor_snapshot,
          email_verification_status,email_verified_at)
         VALUES ($1,$2,$3,'Synthetic',$4,$5,'+2348000000000','Tester','Synthetic P0.9','Nigeria',
          'Testing','Check-in acceptance','Synthetic',true,false,$6,$7,$8,$9,
          'Synthetic admission',ARRAY['Synthetic admission'],'NGN',210000000,$10,$11)`,
        [
          id,
          reference,
          packageIds[definition.student ? 1 : 0],
          definition.key,
          email,
          definition.cancelled ? "CANCELLED" : "SUBMITTED",
          definition.unpaid ? "PENDING" : "PAID",
          `P0.9 ${category}`,
          category,
          definition.unverified ? "UNVERIFIED" : "VERIFIED",
          definition.unverified ? null : new Date(),
        ],
      );
      if (definition.student) {
        await pool.query(
          `INSERT INTO student_verifications
           (id,registration_id,institution_name,institution_country,programme_of_study,
            student_identification_number,expected_graduation_year,status,submitted_at,reviewed_at,reviewed_by_admin_id)
           VALUES ($1,$2,'Synthetic University','Nigeria','Testing','P09-SYNTHETIC',2028,$3,current_timestamp,$4,$5)`,
          [
            randomUUID(),
            id,
            definition.unapproved ? "PENDING" : "APPROVED",
            definition.unapproved ? null : new Date(),
            definition.unapproved ? null : adminIds[0],
          ],
        );
      }
      let paymentId: string | null = null;
      if (!definition.unpaid && !definition.missingAuthority) {
        paymentId = randomUUID();
        const method = definition.method ?? "PAYSTACK";
        const manual = method !== "PAYSTACK";
        const paymentReference = `AIAIAC-${manual ? "MAN" : "PAY"}-${randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
        await pool.query(
          `INSERT INTO payment_transactions
           (id,registration_id,provider,provider_reference,package_code_snapshot,customer_email_snapshot,
            currency,amount_minor,status,financial_authority,provider_status,payment_source,payment_method,
            external_reference,payment_date,recorded_by_admin_id,confirmed_by_admin_id,confirmed_at,paid_at)
           VALUES ($1,$2,$3,$4,'synthetic-check-in',$5,'NGN',210000000,$6,'AUTHORITATIVE','success',
            $3,$7,$8,$9,$10,$10,$9,current_timestamp)`,
          [
            paymentId,
            id,
            manual ? "MANUAL" : "PAYSTACK",
            paymentReference,
            email,
            definition.reconciliation ? "RECONCILIATION_REQUIRED" : "PAID",
            method,
            manual ? `P09-${runId}-${definition.key}` : null,
            manual ? new Date() : null,
            manual ? adminIds[0] : null,
          ],
        );
        await pool.query(
          "UPDATE delegate_registrations SET authoritative_payment_transaction_id=$2 WHERE id=$1",
          [id, paymentId],
        );
      }
      if (definition.duplicate) {
        await pool.query(
          `INSERT INTO payment_transactions
           (id,registration_id,provider,provider_reference,package_code_snapshot,customer_email_snapshot,
            currency,amount_minor,status,financial_authority,provider_status,reconciliation_reason)
           VALUES ($1,$2,'PAYSTACK',$3,'synthetic-check-in',$4,'NGN',210000000,
            'DUPLICATE_SUCCESS','NON_AUTHORITATIVE','success','DUPLICATE_SUCCESS_REQUIRES_RECONCILIATION')`,
          [
            randomUUID(),
            id,
            `AIAIAC-PAY-${randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`,
            email,
          ],
        );
      }
      const eventPassId = randomUUID();
      const credential = createEventPassCredential();
      await pool.query(
        "INSERT INTO delegate_event_passes (id,registration_id,credential_hash,status) VALUES ($1,$2,$3,$4)",
        [
          eventPassId,
          id,
          credential.hash,
          definition.revoked ? "REVOKED" : "ACTIVE",
        ],
      );
      attendees[definition.key] = {
        registrationId: id,
        registrationReference: reference,
        email,
        eventPassId,
        credential: credential.raw,
        credentialHash: credential.hash,
        paymentId,
      };
    }
    return { runId, adminIds, adminEmail, registrationIds, attendees, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
