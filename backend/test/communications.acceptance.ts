import { MailjetDeliveryError } from "../src/email/providers/mailjet.provider";
import { communicationPreferences } from "../src/repositories/communicationPreference.repository";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { EmailService } from "../src/email/email.service";
import type { EmailProvider } from "../src/email/email.types";
import { postgresAdminAuditRepository } from "../src/repositories/adminAudit.repository";
import { postgresCommunicationRepository } from "../src/repositories/communication.repository";
import { CommunicationService } from "../src/services/communication.service";

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (
    target.hostname !== "127.0.0.1" ||
    target.port !== "15440" ||
    target.pathname !== "/communications_fixture"
  )
    throw new Error(
      "Acceptance requires the isolated local communications fixture database",
    );
  const pool = getDatabasePool();
  if (!pool)
    throw new Error("DATABASE_URL is required for Communications acceptance");
  const marker = randomBytes(4).toString("hex");
  const reference = (kind: string) =>
    `AIAIAC-${kind}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const email = (kind: string) => `synthetic-${kind}-${marker}@example.invalid`;
  const ids = {
    professional: randomUUID(),
    student: randomUUID(),
    sponsor: randomUUID(),
    exhibitor: randomUUID(),
    abstract: randomUUID(),
    duplicate: randomUUID(),
  };
  const paymentId = randomUUID();
  let campaignId: string | null = null;
  let campaignReference: string | null = null;
  try {
    const admins = await pool.query<{ id: string }>(
      "SELECT id FROM admins WHERE is_active=true ORDER BY created_at LIMIT 1",
    );
    const adminId = admins.rows[0]?.id;
    if (!adminId)
      throw new Error("An active Admin is required for audit acceptance");
    const packages = await pool.query<{ id: string; delegate_type: string }>(
      "SELECT id,delegate_type FROM delegate_packages WHERE delegate_type IN ('PROFESSIONAL','STUDENT')",
    );
    const professionalPackage = packages.rows.find(
      (item) => item.delegate_type === "PROFESSIONAL",
    )?.id;
    const studentPackage = packages.rows.find(
      (item) => item.delegate_type === "STUDENT",
    )?.id;
    if (!professionalPackage || !studentPackage)
      throw new Error("Both delegate packages are required");

    for (const [id, packageId, kind, category] of [
      [ids.professional, professionalPackage, "professional", "PROFESSIONAL"],
      [ids.student, studentPackage, "student", "STUDENT"],
    ] as const) {
      await pool.query(
        `INSERT INTO delegate_registrations
        (id,reference,package_id,first_name,last_name,email,mobile,job_title,company_name,country,
         primary_activity,main_objective,heard_about_source,privacy_consent,registration_status,payment_status,
         package_name_snapshot,package_type_snapshot,package_description_snapshot,package_benefits_snapshot,
         currency_snapshot,price_minor_snapshot)
        VALUES ($1,$2,$3,'Synthetic','Delegate',$4,'+2348000000000','Engineer','Acceptance','Nigeria',
        'Engineering','Conference acceptance','Direct',true,'APPROVED',$5,$6,$7,'Acceptance',ARRAY['Entry'],$8,$9)`,
        [
          id,
          reference("DEL"),
          packageId,
          email(kind),
          kind === "professional" ? "PAID" : "PENDING",
          kind === "professional"
            ? "Professional Delegate"
            : "Student Delegate",
          category,
          kind === "professional" ? "NGN" : null,
          kind === "professional" ? 210000000 : null,
        ],
      );
    }
    await pool.query(
      `INSERT INTO payment_transactions
      (id,registration_id,provider,provider_reference,package_code_snapshot,customer_email_snapshot,
       currency,amount_minor,status,provider_status,financial_authority,paid_at,verified_at)
      VALUES ($1,$2,'PAYSTACK',$3,'PROFESSIONAL',$4,'NGN',210000000,'PAID',
              'success','AUTHORITATIVE',now(),now())`,
      [
        paymentId,
        ids.professional,
        `AIAIAC-PAY-${randomBytes(12).toString("hex").toUpperCase()}`,
        email("professional"),
      ],
    );
    await pool.query(
      `UPDATE delegate_registrations
       SET authoritative_payment_transaction_id=$2
       WHERE id=$1`,
      [ids.professional, paymentId],
    );
    await pool.query(
      `INSERT INTO student_verifications
      (id,registration_id,institution_name,institution_country,programme_of_study,
       student_identification_number,expected_graduation_year,status,submitted_at,reviewed_at,reviewed_by_admin_id)
      VALUES ($1,$2,'Acceptance University','Nigeria','Engineering','SYN-2027',2027,'APPROVED',now(),now(),$3)`,
      [randomUUID(), ids.student, adminId],
    );

    const packageIds = await pool.query<{ kind: string; id: string }>(`
      SELECT 'sponsor' AS kind,id FROM sponsorship_packages WHERE code='GOLD' AND event_year=2027
      UNION ALL SELECT 'exhibitor' AS kind,id FROM exhibition_packages WHERE code='9_SQM' AND event_year=2027`);
    for (const kind of ["sponsor", "exhibitor"] as const) {
      const packageId = packageIds.rows.find((item) => item.kind === kind)?.id;
      if (!packageId) throw new Error(`${kind} package missing`);
      const table =
        kind === "sponsor" ? "sponsor_applications" : "exhibitor_applications";
      await pool.query(
        `INSERT INTO ${table}
        (id,reference,event_year,package_id,package_code_snapshot,package_name_snapshot,
         currency_snapshot,price_minor_snapshot,organization_name,country,contact_first_name,
         contact_last_name,contact_email,contact_phone,consent,status,reviewed_at,reviewed_by_admin_id)
        VALUES ($1,$2,2027,$3,$4,$5,'USD',$6,'Synthetic Acceptance','Nigeria','Synthetic',
         'Contact',$7,'+2348000000000',true,'CONFIRMED',now(),$8)`,
        [
          ids[kind],
          reference(kind === "sponsor" ? "SPN" : "EXH"),
          packageId,
          kind === "sponsor" ? "GOLD" : "9_SQM",
          kind === "sponsor" ? "Gold Sponsor" : "9 sqm stand",
          kind === "sponsor" ? 3000000 : 699000,
          email(kind),
          adminId,
        ],
      );
    }

    for (const [id, suffix] of [
      [ids.abstract, "one"],
      [ids.duplicate, "two"],
    ] as const) {
      await pool.query(
        `INSERT INTO abstract_submissions
        (id,reference,event_year,author_first_name,author_last_name,author_email,author_phone,
         organization_name,country,title,abstract_body,word_count,status,content_fingerprint,
         submission_key_hash,continuation_token_hash,continuation_token_expires_at,submitted_at)
        VALUES ($1,$2,2027,'Synthetic','Author',$3,'+2348000000000','Acceptance','Nigeria',$4,
        'This synthetic abstract is used only for Communications acceptance.',10,'ACCEPTED',$5,$6,$7,
        now()+interval '1 day',now())`,
        [
          id,
          reference("ABS"),
          email("abstract"),
          `Abstract ${suffix} ${marker}`,
          randomBytes(32).toString("hex"),
          randomBytes(32).toString("hex"),
          randomBytes(32).toString("hex"),
        ],
      );
    }

    for (const kind of [
      "professional",
      "student",
      "sponsor",
      "exhibitor",
      "abstract",
    ])
      await pool.query(
        "INSERT INTO communication_preferences(id,email,consent,evidence,source_label) VALUES($1,$2,'OPTED_IN','Synthetic fixture consent','Acceptance')",
        [randomUUID(), email(kind)],
      );
    const repository = postgresCommunicationRepository;
    assert.equal(
      (
        await repository.recipients({
          code: "PROFESSIONAL_DELEGATES",
          paymentStatus: "PAID",
          country: "Nigeria",
          currency: "NGN",
        })
      ).some((item) => item.email === email("professional")),
      true,
    );
    assert.equal(
      (
        await repository.recipients({
          code: "STUDENT_DELEGATES",
          verificationStatus: "APPROVED",
        })
      ).some((item) => item.email === email("student")),
      true,
    );
    assert.equal(
      (await repository.recipients({ code: "CONFIRMED_SPONSORS" })).some(
        (item) => item.email === email("sponsor"),
      ),
      true,
    );
    assert.equal(
      (await repository.recipients({ code: "CONFIRMED_EXHIBITORS" })).some(
        (item) => item.email === email("exhibitor"),
      ),
      true,
    );
    assert.equal(
      (
        await repository.recipients({
          code: "ABSTRACT_AUTHORS",
          abstractStatus: "ACCEPTED",
        })
      ).filter((item) => item.email === email("abstract")).length,
      1,
    );

    const sentTo: string[] = [];
    let syntheticFailure = true;
    const provider: EmailProvider = {
      async send(message) {
        if (syntheticFailure && message.toEmail === email("abstract")) {
          syntheticFailure = false;
          throw new MailjetDeliveryError("REJECTED");
        }
        sentTo.push(message.toEmail);
        return {
          provider: "MAILJET",
          status: "accepted",
          messageUuid: randomUUID(),
          messageId: "synthetic-message",
        };
      },
    };
    const service = new CommunicationService(
      repository,
      new EmailService(provider, "http://localhost"),
      postgresAdminAuditRepository,
      true,
      undefined,
      {
        publicApiUrl: "https://api.example.invalid",
        secret: "synthetic-fixture-secret-32-characters",
        preferences: communicationPreferences,
      },
    );
    const content = {
      title: `Synthetic campaign ${marker}`,
      subject: "Acceptance communication",
      preheader: "AIAIAC 2027 acceptance",
      heading: "Acceptance only",
      body: "This is a recording-provider acceptance test.",
      audience: {
        code: "ABSTRACT_AUTHORS" as const,
        abstractStatus: "ACCEPTED",
      },
    };
    const campaign = await service.create(content, adminId);
    campaignId = campaign.id;
    campaignReference = campaign.reference;
    const count = await service.audience(content.audience);
    await service.confirm(campaign.reference, count.fingerprint, adminId);
    await service.deliver(campaign.reference, false, adminId);
    const partial = await service.get(campaign.reference);
    assert.ok(partial.failed >= 1);
    await service.deliver(campaign.reference, true, adminId);
    const after = await service.get(campaign.reference);
    assert.equal(after.failed, 0);
    assert.equal(after.sent, count.count);
    assert.equal(sentTo.filter((item) => item === email("abstract")).length, 1);
    const duplicate = await service.deliver(campaign.reference, true, adminId);
    assert.equal(duplicate.processed, 0);
    assert.equal(
      (await repository.deliveries(1, undefined, campaign.reference)).total,
      count.count,
    );
    console.log(
      `Communications PostgreSQL acceptance PASS: 5 source families, abstract deduplication, persisted campaign, partial failure/retry, ${count.count} recorded deliveries; no real provider`,
    );
  } finally {
    await pool.query(
      "DELETE FROM communication_preferences WHERE email LIKE $1",
      [`synthetic-%-${marker}@example.invalid`],
    );
    if (campaignId)
      await pool.query(
        "DELETE FROM admin_audit_logs WHERE entity_type='COMMUNICATION_CAMPAIGN' AND entity_id=$1",
        [campaignId],
      );
    if (campaignId)
      await pool.query("DELETE FROM communication_campaigns WHERE id=$1", [
        campaignId,
      ]);
    await pool.query(
      "DELETE FROM abstract_submissions WHERE id=ANY($1::uuid[])",
      [[ids.abstract, ids.duplicate]],
    );
    await pool.query("DELETE FROM sponsor_applications WHERE id=$1", [
      ids.sponsor,
    ]);
    await pool.query("DELETE FROM exhibitor_applications WHERE id=$1", [
      ids.exhibitor,
    ]);
    await pool.query(
      "UPDATE delegate_registrations SET authoritative_payment_transaction_id=NULL WHERE id=$1",
      [ids.professional],
    );
    await pool.query("DELETE FROM payment_transactions WHERE id=$1", [
      paymentId,
    ]);
    await pool.query(
      "DELETE FROM delegate_registrations WHERE id=ANY($1::uuid[])",
      [[ids.professional, ids.student]],
    );
    await closeDatabasePool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
