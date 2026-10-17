/** Synthetic local PostgreSQL acceptance for Step 4B; no real email or payment provider. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { createConfiguredApplication } from "../src/app";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { env } from "../src/config/env";
import { getPermissionsForRole } from "../src/config/permissions";
import { EmailService } from "../src/email/email.service";
import type { EmailProvider } from "../src/email/email.types";
import { postgresAccreditationRepository } from "../src/repositories/accreditation.repository";
import { postgresAdminAuditRepository } from "../src/repositories/adminAudit.repository";
import { postgresCommercialApplicationRepository } from "../src/repositories/commercialApplication.repository";
import {
  AccreditationService,
  AccreditationConflictError,
  AccreditationSourceError,
  AccreditationTransitionError,
} from "../src/services/accreditation.service";
import { CommercialApplicationService } from "../src/services/commercialApplication.service";
import { hashPassword } from "../src/services/password.service";
import type { AdminRole, SafeAdmin } from "../src/types/admin";
import { accreditationCreateSchema } from "../src/validators/accreditation.validator";

async function main() {
  const url = env.databaseUrl ? new URL(env.databaseUrl) : null;
  if (
    !url ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/aiaiac_dev"
  ) {
    throw new Error("Acceptance is restricted to local aiaiac_dev PostgreSQL");
  }
  const pool = getDatabasePool();
  if (!pool || !env.sessionSecret)
    throw new Error("Local database and session secret required");
  const suffix = randomBytes(5).toString("hex");
  const eventId = randomUUID();
  const eventCode = `AIAIAC-TEST-${suffix.toUpperCase()}`;
  const people = (
    [
      "SUPER_ADMIN",
      "CHECK_IN_STAFF",
      "CHECK_IN_STAFF",
      "FINANCE",
      "COMMUNICATIONS",
    ] as AdminRole[]
  ).map((role, index) => ({
    id: randomUUID(),
    role,
    email: `accreditation-${index}-${suffix}@example.invalid`,
    password: `Synthetic-${randomUUID()}-A1`,
  }));
  const owner = people[0]!;
  const actor: SafeAdmin = {
    id: owner.id,
    role: "SUPER_ADMIN",
    fullName: "Synthetic Accreditation Owner",
    email: owner.email,
    permissions: getPermissionsForRole("SUPER_ADMIN"),
  };
  const ids = people.map((person) => person.id);
  const service = new AccreditationService(
    postgresAccreditationRepository,
    postgresAdminAuditRepository,
  );
  const provider: EmailProvider = { async send() {} };
  const commercial = new CommercialApplicationService(
    postgresCommercialApplicationRepository,
    new EmailService(provider, "http://localhost:5173"),
  );
  const createdAccreditations: string[] = [];
  const sponsorReferences: string[] = [];
  const exhibitorReferences: string[] = [];
  const contactId = randomUUID();
  const abstractId = randomUUID();
  const contactEmail = `contact-${suffix}@example.invalid`;
  const abstractEmail = `abstract-${suffix}@example.invalid`;

  const snapshot = async () => {
    const result = await pool.query(
      `SELECT
       (SELECT count(*)::int FROM delegate_registrations) AS registrations,
       (SELECT count(*)::int FROM delegate_event_passes) AS passes,
       (SELECT count(*)::int FROM delegate_check_ins) AS check_ins,
       (SELECT count(*)::int FROM payment_transactions) AS payments,
       (SELECT count(*)::int FROM delegate_email_verifications) AS email_verifications,
       (SELECT md5(coalesce(string_agg(id::text || credential_hash::text || status ||
         coalesce(checked_in_at::text,''),'|' ORDER BY id),'')) FROM delegate_event_passes)
         AS pass_digest,
       (SELECT md5(coalesce(string_agg(id::text || event_pass_id::text ||
         checked_in_at::text,'|' ORDER BY id),'')) FROM delegate_check_ins)
         AS admission_digest`,
    );
    return result.rows[0];
  };
  const before = await snapshot();
  try {
    for (const person of people) {
      await pool.query(
        `INSERT INTO admins (id,full_name,email,password_hash,role)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          person.id,
          `Synthetic ${person.role} ${suffix}`,
          person.email,
          await hashPassword(person.password),
          person.role,
        ],
      );
    }
    await pool.query(
      "INSERT INTO conference_events (id,code,name,event_year) VALUES ($1,$2,$3,2028)",
      [eventId, eventCode, `Synthetic 2028 ${suffix}`],
    );
    const events = await service.events();
    const current = events.find((event) => event.code === "AIAIAC-AFRICA-2027");
    assert.ok(current);
    assert.ok(events.some((event) => event.id === eventId));
    await pool.query(
      `INSERT INTO communication_manual_contacts (id,name,email,origin)
       VALUES ($1,'Synthetic Contact',$2,'MANUAL')`,
      [contactId, contactEmail],
    );
    await pool.query(
      `INSERT INTO abstract_submissions
       (id,reference,author_first_name,author_last_name,author_email,author_phone,
        organization_name,country,title,abstract_body,word_count,status,
        content_fingerprint,submission_key_hash,continuation_token_hash,
        continuation_token_expires_at,reviewer_id,submitted_at,decided_at)
       VALUES ($1,$2,'Synthetic','Author',$3,'+2348000000000',
        'Synthetic Research','Nigeria','Synthetic accepted abstract',
        'Synthetic accepted abstract without speaker accreditation.',6,'ACCEPTED',
        $4,$5,$6,now() + interval '1 day',$7,now(),now())`,
      [
        abstractId,
        `AIAIAC-ABS-${suffix.slice(0, 8).toUpperCase()}`,
        abstractEmail,
        randomBytes(32).toString("hex"),
        randomBytes(32).toString("hex"),
        randomBytes(32).toString("hex"),
        owner.id,
      ],
    );
    const unrelated = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM event_accreditations
       WHERE event_id=$1 AND email=ANY($2::text[])`,
      [current.id, [contactEmail, abstractEmail]],
    );
    assert.equal(unrelated.rows[0]?.count, 0);
    const linked = (await service.list({ eventId: current.id })).accreditations;
    const delegateCount = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM delegate_registrations",
    );
    assert.equal(
      linked.filter((item) => item.sourceType === "DELEGATE_REGISTRATION")
        .length,
      delegateCount.rows[0]?.count,
    );
    assert.ok(
      linked
        .filter((item) => item.sourceType === "DELEGATE_REGISTRATION")
        .every((item) => item.status === "LINKED"),
    );

    const sponsorA = await commercial.createSponsor({
      organizationName: `Synthetic Sponsor A ${suffix}`,
      country: "Nigeria",
      contactFirstName: "Sponsor",
      contactLastName: "A",
      contactEmail: `sponsor-a-${suffix}@example.invalid`,
      contactPhone: "+2348000000000",
      sponsorshipTier: "GOLD",
      consent: true,
    });
    sponsorReferences.push(sponsorA.reference);
    const sponsorB = await commercial.createSponsor({
      organizationName: `Synthetic Sponsor B ${suffix}`,
      country: "Nigeria",
      contactFirstName: "Sponsor",
      contactLastName: "B",
      contactEmail: `sponsor-b-${suffix}@example.invalid`,
      contactPhone: "+2348000000001",
      sponsorshipTier: "GOLD",
      consent: true,
    });
    sponsorReferences.push(sponsorB.reference);
    const exhibitor = await commercial.createExhibitor({
      organizationName: `Synthetic Exhibitor ${suffix}`,
      country: "Ghana",
      contactFirstName: "Exhibitor",
      contactLastName: "A",
      contactEmail: `exhibitor-${suffix}@example.invalid`,
      contactPhone: "+233200000000",
      exhibitionOption: "18_SQM",
      consent: true,
    });
    exhibitorReferences.push(exhibitor.reference);

    const create = async (
      event: string,
      category: Parameters<typeof service.create>[1]["category"],
      name: string,
      applicationReference?: string,
    ) => {
      const input = accreditationCreateSchema.parse({
        eventId: event,
        category,
        fullName: name,
        email: `${name.toLowerCase().replaceAll(" ", "-")}-${suffix}@example.invalid`,
        ...(applicationReference
          ? { sourceApplicationReference: applicationReference }
          : {}),
      });
      const result = await service.create(actor, input);
      createdAccreditations.push(result.id);
      return result;
    };
    const sponsorRep1 = await create(
      current.id,
      "SPONSOR_REPRESENTATIVE",
      "Sponsor Rep One",
      sponsorA.reference,
    );
    const sponsorRep2 = await create(
      current.id,
      "SPONSOR_REPRESENTATIVE",
      "Sponsor Rep Two",
      sponsorA.reference,
    );
    const sponsorRepB = await create(
      current.id,
      "SPONSOR_REPRESENTATIVE",
      "Sponsor Rep Three",
      sponsorB.reference,
    );
    const exhibitorRep1 = await create(
      current.id,
      "EXHIBITOR_REPRESENTATIVE",
      "Exhibitor Rep One",
      exhibitor.reference,
    );
    const exhibitorRep2 = await create(
      current.id,
      "EXHIBITOR_REPRESENTATIVE",
      "Exhibitor Rep Two",
      exhibitor.reference,
    );
    assert.equal(sponsorRep1.sourceId, sponsorRep2.sourceId);
    assert.notEqual(sponsorRep1.sourceId, sponsorRepB.sourceId);
    assert.equal(exhibitorRep1.sourceId, exhibitorRep2.sourceId);
    assert.equal(sponsorRep1.status, "PENDING");
    assert.equal(exhibitorRep1.status, "PENDING");
    await assert.rejects(
      service.updateStatus(actor, sponsorRep1.id, "APPROVED"),
      AccreditationTransitionError,
    );
    await assert.rejects(
      service.updateStatus(actor, exhibitorRep1.id, "APPROVED"),
      AccreditationTransitionError,
    );
    await assert.rejects(
      create(
        eventId,
        "SPONSOR_REPRESENTATIVE",
        "Wrong Year Rep",
        sponsorA.reference,
      ),
      AccreditationSourceError,
    );
    assert.throws(() =>
      accreditationCreateSchema.parse({
        eventId: current.id,
        category: "EXHIBITOR_REPRESENTATIVE",
        fullName: "Wrong Kind Rep",
        email: `wrong-kind-${suffix}@example.invalid`,
        sourceApplicationReference: sponsorA.reference,
      }),
    );
    await assert.rejects(
      service.create(
        actor,
        accreditationCreateSchema.parse({
          eventId: current.id,
          category: "SPONSOR_REPRESENTATIVE",
          fullName: "Same Person",
          email: sponsorRep1.email,
          sourceApplicationReference: sponsorB.reference,
        }),
      ),
      AccreditationConflictError,
    );

    for (const category of [
      "SPEAKER",
      "MEDIA_PRESS",
      "PARTNER",
      "VIP_GUEST",
      "COMMITTEE_ORGANIZER",
      "STAFF_VOLUNTEER",
    ] as const) {
      const record = await create(
        current.id,
        category,
        `Synthetic ${category}`,
      );
      assert.equal(record.status, "PENDING");
      assert.equal(record.sourceType, "ADMIN_INTAKE");
      assert.equal(record.sourceId, null);
      const approved = await service.updateStatus(actor, record.id, "APPROVED");
      assert.equal(approved.status, "APPROVED");
    }
    const secondEventSpeaker = await create(
      eventId,
      "SPEAKER",
      "Synthetic SPEAKER",
    );
    assert.equal(secondEventSpeaker.eventId, eventId);
    assert.equal((await service.list({ eventId })).accreditations.length, 1);
    assert.equal(
      (await service.list({ eventId: current.id, category: "SPEAKER" }))
        .accreditations.length,
      1,
    );
    assert.equal(
      (
        await service.list({
          eventId: current.id,
          category: "STUDENT_DELEGATE",
        })
      ).accreditations.every((item) => item.status === "LINKED"),
      true,
    );
    const auditedAccreditationCount = createdAccreditations.length;
    const paginated = await pool.query<{ id: string }>(
      `INSERT INTO event_accreditations
       (id,event_id,category,full_name,email,status,source_type,created_by_admin_id)
       SELECT gen_random_uuid(),$1,'SPEAKER','Synthetic Page ' || n,
              'page-' || n || '-' || $2 || '@example.invalid',
              'PENDING','ADMIN_INTAKE',$3
       FROM generate_series(1,55) AS n RETURNING id`,
      [eventId, suffix, owner.id],
    );
    createdAccreditations.push(...paginated.rows.map((row) => row.id));
    const firstPage = await service.list({ eventId, page: 1 });
    const secondPage = await service.list({ eventId, page: 2 });
    assert.equal(firstPage.accreditations.length, 50);
    assert.equal(firstPage.hasMore, true);
    assert.equal(secondPage.accreditations.length, 6);
    assert.equal(secondPage.hasMore, false);
    assert.equal(
      firstPage.accreditations.some((item) =>
        secondPage.accreditations.some((other) => other.id === item.id),
      ),
      false,
    );

    const app = createConfiguredApplication();
    const ownerAgent = request.agent(app);
    await ownerAgent
      .post("/api/auth/login")
      .send({ email: owner.email, password: owner.password })
      .expect(200);
    await ownerAgent
      .get(`/api/admin/accreditations?eventId=${current.id}`)
      .expect(200);
    const pageResponse = await ownerAgent
      .get(`/api/admin/accreditations?eventId=${eventId}&page=2`)
      .expect(200);
    assert.equal(pageResponse.body.data.page, 2);
    assert.equal(pageResponse.body.data.accreditations.length, 6);
    await ownerAgent
      .get(`/api/admin/accreditations?eventId=${eventId}&page=0`)
      .expect(400);
    await ownerAgent
      .get(`/api/admin/accreditations?eventId=${eventId}&page=invalid`)
      .expect(400);
    await ownerAgent
      .post("/api/admin/accreditations")
      .set("X-AIAIAC-CSRF", "1")
      .set("Origin", "http://localhost:5173")
      .send({
        eventId: current.id,
        category: "PROFESSIONAL_DELEGATE",
        fullName: "Forbidden",
        email: `forbidden-${suffix}@example.invalid`,
      })
      .expect(400);

    const scannerCookies: string[] = [];
    for (const person of people.slice(1)) {
      const agent = request.agent(app);
      const login = await agent
        .post("/api/auth/login")
        .send({ email: person.email, password: person.password })
        .expect(200);
      if (person.role === "CHECK_IN_STAFF") {
        scannerCookies.push(login.headers["set-cookie"]?.[0] ?? "");
        const me = await agent.get("/api/auth/me").expect(200);
        assert.deepEqual(me.body.data.admin.permissions, [
          "check_in.read",
          "check_in.manage",
        ]);
        await agent.get("/api/admin/check-in/count").expect(200);
        for (const path of [
          "/api/admin/users",
          "/api/admin/accreditations/events",
          "/api/admin/overview",
          "/api/admin/payments",
          "/api/admin/communications/contacts",
          "/api/admin/student-verifications",
          "/api/admin/sponsor-applications",
          "/api/admin/exhibitor-applications",
          "/api/admin/test",
        ]) {
          await agent.get(path).expect(403);
        }
        await agent.get("/api/admin/reports/preview").expect(403);
        await agent
          .post("/api/admin/users/invitations")
          .set("X-AIAIAC-CSRF", "1")
          .set("Origin", "http://localhost:5173")
          .send({
            name: "No",
            email: `no-${suffix}@example.invalid`,
            role: "ADMIN",
          })
          .expect(403);
      } else {
        await agent.get("/api/admin/check-in/count").expect(403);
      }
    }
    assert.equal(scannerCookies.length, 2);
    assert.notEqual(scannerCookies[0], scannerCookies[1]);
    assert.deepEqual(await snapshot(), before);
    const audit = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM admin_audit_logs WHERE admin_id=$1 AND entity_type='EVENT_ACCREDITATION'",
      [owner.id],
    );
    assert.ok((audit.rows[0]?.count ?? 0) >= auditedAccreditationCount);
    console.log(
      "Accreditation PostgreSQL acceptance PASS: delegate links, event scope, multi-representatives, paginated list, contacts/abstracts isolated, controlled intake, scanner RBAC/sessions, unchanged payments/pass/check-ins",
    );
  } finally {
    await pool.query(
      "DELETE FROM session WHERE sess->>'adminId'=ANY($1::text[])",
      [ids],
    );
    await pool.query(
      "DELETE FROM admin_audit_logs WHERE admin_id=ANY($1::uuid[])",
      [ids],
    );
    await pool.query(
      "DELETE FROM event_accreditations WHERE id=ANY($1::uuid[])",
      [createdAccreditations],
    );
    await pool.query("DELETE FROM abstract_submissions WHERE id=$1", [
      abstractId,
    ]);
    await pool.query("DELETE FROM communication_manual_contacts WHERE id=$1", [
      contactId,
    ]);
    for (const reference of sponsorReferences)
      await pool.query("DELETE FROM sponsor_applications WHERE reference=$1", [
        reference,
      ]);
    for (const reference of exhibitorReferences)
      await pool.query(
        "DELETE FROM exhibitor_applications WHERE reference=$1",
        [reference],
      );
    await pool.query("DELETE FROM conference_events WHERE id=$1", [eventId]);
    await pool.query("DELETE FROM admins WHERE id=ANY($1::uuid[])", [ids]);
    const remaining = await pool.query<{
      admins: number;
      events: number;
      accreditations: number;
      contacts: number;
      abstracts: number;
    }>(
      `SELECT
       (SELECT count(*)::int FROM admins WHERE id=ANY($1::uuid[])) AS admins,
       (SELECT count(*)::int FROM conference_events WHERE id=$2) AS events,
       (SELECT count(*)::int FROM event_accreditations WHERE id=ANY($3::uuid[])) AS accreditations,
       (SELECT count(*)::int FROM communication_manual_contacts WHERE id=$4) AS contacts,
       (SELECT count(*)::int FROM abstract_submissions WHERE id=$5) AS abstracts`,
      [ids, eventId, createdAccreditations, contactId, abstractId],
    );
    assert.deepEqual(remaining.rows[0], {
      admins: 0,
      events: 0,
      accreditations: 0,
      contacts: 0,
      abstracts: 0,
    });
    await closeDatabasePool();
  }
}

void main().catch((error) => {
  console.error(
    "Accreditation acceptance failed",
    error instanceof Error ? error.message : "unknown",
  );
  process.exitCode = 1;
});
