import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import type { DatabaseExecutor } from "../types/database";
import { getDatabasePool } from "../config/database";
import type {
  ContactFilters,
  ContactRecord,
  ContactSource,
  ManualContactInput,
} from "../types/contact";

function database(executor?: DatabaseExecutor) {
  const pool = executor ?? getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

interface ContactRow extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  country: string | null;
  status: string;
  created_at: Date;
  source: ContactSource;
  types: ContactRecord["types"];
}

function mapContact(row: ContactRow): ContactRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    organization: row.organization,
    country: row.country,
    status: row.status,
    createdAt: row.created_at,
    source: row.source,
    types: row.types,
    consent: row.consent ?? "UNKNOWN",
    suppressed: row.suppressed ?? false,
    sourceLabel: row.source_label ?? null,
  };
}

// Source records remain authoritative. This CTE only projects them into a read-only view.
const contactsSql = `WITH all_contacts AS (
  SELECT 'delegate:' || dr.id::text AS id,
         lower(btrim(dr.email)) AS email,
         concat_ws(' ',dr.first_name,dr.last_name) AS name,
         dr.company_name AS organization,dr.country,
         dr.registration_status AS status,dr.submitted_at AS created_at,
         'SYSTEM'::text AS source,
         CASE WHEN dr.package_type_snapshot='STUDENT' THEN 'STUDENT_DELEGATE'
              ELSE 'PROFESSIONAL_DELEGATE' END AS contact_type,
         CASE WHEN dr.package_type_snapshot='STUDENT' THEN 1 ELSE 0 END AS source_rank
  FROM delegate_registrations dr
  UNION ALL
  SELECT 'sponsor:' || sa.id::text,lower(btrim(sa.contact_email)),
         concat_ws(' ',sa.contact_first_name,sa.contact_last_name),
         sa.organization_name,sa.country,sa.status,sa.created_at,
         'SYSTEM','SPONSOR',2
  FROM sponsor_applications sa WHERE sa.event_year=2027
  UNION ALL
  SELECT 'exhibitor:' || ea.id::text,lower(btrim(ea.contact_email)),
         concat_ws(' ',ea.contact_first_name,ea.contact_last_name),
         ea.organization_name,ea.country,ea.status,ea.created_at,
         'SYSTEM','EXHIBITOR',3
  FROM exhibitor_applications ea WHERE ea.event_year=2027
  UNION ALL
  SELECT 'abstract:' || a.id::text,lower(btrim(a.author_email)),
         concat_ws(' ',a.author_first_name,a.author_last_name),
         a.organization_name,a.country,a.status,a.created_at,
         'SYSTEM','ABSTRACT_AUTHOR',4
  FROM abstract_submissions a WHERE a.event_year=2027
  UNION ALL
  SELECT 'manual:' || mc.id::text,mc.email,mc.name,mc.organization,mc.country,
         mc.status,mc.created_at,mc.origin,mc.category,5
  FROM communication_manual_contacts mc
), preferred AS (
  SELECT DISTINCT ON (email) id,name,email,organization,country,status,
         created_at,source
  FROM all_contacts
  ORDER BY email,source_rank,created_at DESC,id
), type_groups AS (
  SELECT email,
         array_agg(DISTINCT contact_type ORDER BY contact_type)
           FILTER (WHERE source='SYSTEM') AS system_types,
         array_agg(DISTINCT contact_type ORDER BY contact_type) AS all_types
  FROM all_contacts GROUP BY email
), contacts AS (
  SELECT p.*,CASE WHEN p.source='SYSTEM' THEN g.system_types ELSE g.all_types END AS types
  FROM preferred p JOIN type_groups g USING (email)
), filtered AS (
  SELECT * FROM contacts c
  WHERE ($1::text IS NULL OR position(lower($1::text) in lower(c.name))>0
         OR position(lower($1::text) in c.email)>0
         OR position(lower($1::text) in lower(coalesce(c.organization,'')))>0)
    AND ($2::text IS NULL OR $2::text=ANY(c.types))
    AND ($3::text IS NULL OR c.source=$3::text)
)`;

const existingEmailsSql = `SELECT DISTINCT email FROM (
  SELECT lower(btrim(email)) AS email FROM delegate_registrations
    WHERE lower(btrim(email))=ANY($1::text[])
  UNION ALL
  SELECT lower(btrim(contact_email)) FROM sponsor_applications
    WHERE event_year=2027 AND lower(btrim(contact_email))=ANY($1::text[])
  UNION ALL
  SELECT lower(btrim(contact_email)) FROM exhibitor_applications
    WHERE event_year=2027 AND lower(btrim(contact_email))=ANY($1::text[])
  UNION ALL
  SELECT lower(btrim(author_email)) FROM abstract_submissions
    WHERE event_year=2027 AND lower(btrim(author_email))=ANY($1::text[])
  UNION ALL
  SELECT email FROM communication_manual_contacts WHERE email=ANY($1::text[])
) existing`;

export interface ContactRepository {
  list(
    filters: ContactFilters,
  ): Promise<{ items: ContactRecord[]; total: number }>;
  existingEmails(emails: readonly string[]): Promise<Set<string>>;
  insertManual(
    input: ManualContactInput,
    source: "MANUAL" | "IMPORT",
    adminId: string,
    executor?: DatabaseExecutor,
  ): Promise<ContactRecord | null>;
  insertImported(
    inputs: readonly ManualContactInput[],
    adminId: string,
    executor?: DatabaseExecutor,
  ): Promise<Set<string>>;
}

export const postgresContactRepository: ContactRepository = {
  async list(filters) {
    const values = [
      filters.search ?? null,
      filters.type ?? null,
      filters.source ?? null,
    ];
    const count = await database().query<{ total: number }>(
      `${contactsSql} SELECT count(*)::int AS total FROM filtered`,
      values,
    );
    const rows = await database().query<ContactRow>(
      `${contactsSql} SELECT f.id,name,f.email,organization,country,status,f.created_at,source,types,p.consent,p.suppressed,p.source_label
       FROM filtered f LEFT JOIN communication_preferences p ON p.email=f.email ORDER BY f.created_at DESC,f.id LIMIT $4 OFFSET $5`,
      [...values, filters.limit, (filters.page - 1) * filters.limit],
    );
    return {
      items: rows.rows.map(mapContact),
      total: count.rows[0]?.total ?? 0,
    };
  },

  async existingEmails(emails) {
    if (!emails.length) return new Set<string>();
    const result = await database().query<{ email: string }>(
      existingEmailsSql,
      [emails],
    );
    return new Set(result.rows.map((row) => row.email));
  },

  async insertManual(input, source, adminId, executor) {
    const result = await database(executor).query<ContactRow>(
      `WITH inserted AS (INSERT INTO communication_manual_contacts
       (id,name,email,organization,country,origin,created_by_admin_id,consent,consent_evidence,source_label,category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (email) DO NOTHING
       RETURNING 'manual:' || id::text AS id,name,email,organization,country,
                 status,created_at,origin AS source,ARRAY[category]::text[] AS types), preferences AS (INSERT INTO communication_preferences(id,email,consent,evidence,source_label) SELECT $1,$3,$8,$9,$10 FROM inserted ON CONFLICT(email) DO NOTHING) SELECT * FROM inserted`,
      [
        randomUUID(),
        input.name,
        input.email,
        input.organization ?? null,
        input.country ?? null,
        source,
        adminId,
        input.consent ?? "UNKNOWN",
        input.consentEvidence ?? null,
        input.sourceLabel ?? null,
        input.category ?? "GENERAL_CONTACT",
      ],
    );
    if (!result.rows[0]) return null;
    const preference = await database(executor).query(
      "SELECT consent,suppressed,source_label FROM communication_preferences WHERE email=$1",
      [input.email],
    );
    return mapContact({ ...result.rows[0], ...preference.rows[0] });
  },

  async insertImported(inputs, adminId, executor) {
    if (!inputs.length) return new Set<string>();
    const records = inputs.map((input) => ({ id: randomUUID(), ...input }));
    const result = await database(executor).query<{ email: string }>(
      `WITH inserted AS (INSERT INTO communication_manual_contacts
       (id,name,email,organization,country,origin,created_by_admin_id,consent,consent_evidence,source_label,category)
       SELECT item.id,item.name,item.email,item.organization,item.country,'IMPORT',$2,coalesce(item.consent,'UNKNOWN'),item."consentEvidence",item."sourceLabel",coalesce(item.category,'GENERAL_CONTACT')
       FROM jsonb_to_recordset($1::jsonb) AS item(
         id uuid,name text,email text,organization text,country text,consent text,"consentEvidence" text,"sourceLabel" text,category text
       )
       ON CONFLICT (email) DO NOTHING RETURNING id,email,consent,consent_evidence,source_label), preferences AS (INSERT INTO communication_preferences(id,email,consent,evidence,source_label) SELECT id,email,consent,consent_evidence,source_label FROM inserted ON CONFLICT(email) DO NOTHING) SELECT email FROM inserted`,
      [JSON.stringify(records), adminId],
    );
    return new Set(result.rows.map((row) => row.email));
  },
};
