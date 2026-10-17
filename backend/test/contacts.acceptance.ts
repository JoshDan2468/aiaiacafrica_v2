import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { postgresContactRepository } from "../src/repositories/contact.repository";
import { ContactService } from "../src/services/contact.service";

async function main() {
  const pool = getDatabasePool();
  if (!pool)
    throw new Error(
      "DATABASE_URL is required for Contacts PostgreSQL acceptance",
    );
  const marker = randomBytes(5).toString("hex");
  const email = (kind: string) => `contacts-${kind}-${marker}@example.invalid`;
  const reference = (kind: string) =>
    `AIAIAC-${kind}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const ids = {
    professional: randomUUID(),
    student: randomUUID(),
    sponsor: randomUUID(),
    exhibitor: randomUUID(),
    abstract: randomUUID(),
    abstractDuplicate: randomUUID(),
  };
  const manualEmails = [email("manual"), email("import")];
  try {
    const admin = await pool.query<{ id: string }>(
      "SELECT id FROM admins WHERE is_active=true LIMIT 1",
    );
    const adminId = admin.rows[0]?.id;
    if (!adminId)
      throw new Error("An active Admin is required for Contacts acceptance");
    const packages = await pool.query<{ id: string; delegate_type: string }>(
      "SELECT id,delegate_type FROM delegate_packages WHERE delegate_type IN ('PROFESSIONAL','STUDENT')",
    );
    for (const kind of ["professional", "student"] as const) {
      const packageId = packages.rows.find(
        (item) => item.delegate_type === kind.toUpperCase(),
      )?.id;
      if (!packageId) throw new Error(`${kind} package missing`);
      await pool.query(
        `INSERT INTO delegate_registrations
         (id,reference,package_id,first_name,last_name,email,mobile,job_title,company_name,country,
          primary_activity,main_objective,heard_about_source,privacy_consent,registration_status,
          payment_status,package_name_snapshot,package_type_snapshot,package_description_snapshot,
          package_benefits_snapshot,currency_snapshot,price_minor_snapshot)
         VALUES ($1,$2,$3,'Synthetic','Delegate',$4,'+2348000000000','Engineer','Acceptance','Nigeria',
          'Engineering','Contact acceptance','Direct',true,'APPROVED','PENDING',$5,$6,'Acceptance',
          ARRAY['Entry'],NULL,NULL)`,
        [
          ids[kind],
          reference("DEL"),
          packageId,
          email(kind),
          `${kind} Delegate`,
          kind.toUpperCase(),
        ],
      );
    }
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
    await pool.query(
      `INSERT INTO abstract_submissions
       (id,reference,event_year,author_first_name,author_last_name,author_email,author_phone,
        organization_name,country,title,abstract_body,word_count,status,content_fingerprint,
        submission_key_hash,continuation_token_hash,continuation_token_expires_at,submitted_at)
       VALUES ($1,$2,2027,'Synthetic','Author',$3,'+2348000000000','Acceptance','Nigeria',$4,
        'Synthetic abstract for contacts acceptance.',6,'ACCEPTED',$5,$6,$7,now()+interval '1 day',now())`,
      [
        ids.abstract,
        reference("ABS"),
        email("abstract"),
        `Contacts ${marker}`,
        randomBytes(32).toString("hex"),
        randomBytes(32).toString("hex"),
        randomBytes(32).toString("hex"),
      ],
    );
    await pool.query(
      `INSERT INTO abstract_submissions
       (id,reference,event_year,author_first_name,author_last_name,author_email,author_phone,
        organization_name,country,title,abstract_body,word_count,status,content_fingerprint,
        submission_key_hash,continuation_token_hash,continuation_token_expires_at,submitted_at)
       VALUES ($1,$2,2027,'Synthetic','Sponsor Author',$3,'+2348000000000','Acceptance',
        'Nigeria',$4,'Synthetic abstract for contact deduplication.',6,'ACCEPTED',$5,$6,$7,
        now()+interval '1 day',now())`,
      [
        ids.abstractDuplicate,
        reference("ABS"),
        email("sponsor"),
        `Contact dedup ${marker}`,
        randomBytes(32).toString("hex"),
        randomBytes(32).toString("hex"),
        randomBytes(32).toString("hex"),
      ],
    );

    const service = new ContactService(postgresContactRepository);
    const filter = (search: string) => ({ page: 1, limit: 25, search });
    const expected = [
      "professional",
      "student",
      "sponsor",
      "exhibitor",
      "abstract",
    ] as const;
    for (const kind of expected) {
      const result = await service.list(filter(email(kind)));
      assert.equal(result.total, 1, `${kind} authoritative source is visible`);
      assert.equal(result.items[0]?.source, "SYSTEM");
      assert.equal(result.items[0]?.email, email(kind));
    }
    assert.deepEqual(
      (
        await service.list({
          ...filter(email("student")),
          type: "STUDENT_DELEGATE",
        })
      ).items[0]?.types,
      ["STUDENT_DELEGATE"],
    );
    assert.equal(
      (await service.list({ ...filter(email("sponsor")), type: "EXHIBITOR" }))
        .total,
      0,
    );
    assert.deepEqual(
      (await service.list(filter(email("sponsor")))).items[0]?.types,
      ["ABSTRACT_AUTHOR", "SPONSOR"],
      "one email retains multiple authoritative audience types",
    );
    assert.equal(
      (await service.list({ ...filter(email("sponsor")), source: "MANUAL" }))
        .total,
      0,
    );

    const before = await pool.query<{
      delegates: number;
      sponsors: number;
      exhibitors: number;
      abstracts: number;
    }>(
      `SELECT (SELECT count(*)::int FROM delegate_registrations) AS delegates,
              (SELECT count(*)::int FROM sponsor_applications) AS sponsors,
              (SELECT count(*)::int FROM exhibitor_applications) AS exhibitors,
              (SELECT count(*)::int FROM abstract_submissions) AS abstracts`,
    );
    const added = await service.add(
      {
        name: "Manual Contact",
        email: email("manual").toUpperCase(),
        organization: "Existing AIAIAC partner",
        country: "Nigeria",
      },
      adminId,
    );
    assert.equal(added.source, "MANUAL");
    await assert.rejects(
      service.add({ name: "Duplicate", email: email("professional") }, adminId),
      /already exists/,
    );
    const summary = await service.importCsv(
      `name,email,organization,country\nImported,${email("import").toUpperCase()},AIAIAC,Nigeria\n` +
        `Repeat,${email("import")},AIAIAC,Nigeria\nRegistered,${email("student")},AIAIAC,Nigeria\n` +
        "Invalid,not-an-email,AIAIAC,Nigeria",
      adminId,
    );
    assert.deepEqual(
      {
        imported: summary.imported,
        skipped: summary.skipped,
        invalid: summary.invalid,
      },
      { imported: 1, skipped: 2, invalid: 1 },
    );
    assert.equal(
      (await service.list({ ...filter(email("import")), source: "IMPORT" }))
        .total,
      1,
    );
    assert.equal(
      (await service.list({ ...filter(email("manual")), source: "MANUAL" }))
        .total,
      1,
    );
    const after = await pool.query<(typeof before.rows)[0]>(
      `SELECT (SELECT count(*)::int FROM delegate_registrations) AS delegates,
              (SELECT count(*)::int FROM sponsor_applications) AS sponsors,
              (SELECT count(*)::int FROM exhibitor_applications) AS exhibitors,
              (SELECT count(*)::int FROM abstract_submissions) AS abstracts`,
    );
    assert.deepEqual(
      after.rows[0],
      before.rows[0],
      "manual/import never create business records",
    );
    console.log(
      "Contacts PostgreSQL acceptance PASS: five authoritative source types, filters, normalized manual/import, duplicate/invalid summary, unchanged business-record counts; no email sent",
    );
  } finally {
    await pool.query(
      "DELETE FROM communication_manual_contacts WHERE email=ANY($1::text[])",
      [manualEmails],
    );
    await pool.query(
      "DELETE FROM abstract_submissions WHERE id=ANY($1::uuid[])",
      [[ids.abstract, ids.abstractDuplicate]],
    );
    await pool.query("DELETE FROM sponsor_applications WHERE id=$1", [
      ids.sponsor,
    ]);
    await pool.query("DELETE FROM exhibitor_applications WHERE id=$1", [
      ids.exhibitor,
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
