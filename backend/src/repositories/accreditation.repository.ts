import type { QueryResultRow } from "pg";
import { randomUUID } from "node:crypto";
import { getDatabasePool } from "../config/database";
import type { DatabaseExecutor } from "../types/database";
import type {
  Accreditation,
  AccreditationCategory,
  AccreditationPage,
  AccreditationSourceType,
  AccreditationStatus,
  ConferenceEvent,
} from "../types/accreditation";

interface EventRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  event_year: number;
  is_active: boolean;
}
interface ApplicationRow extends QueryResultRow {
  id: string;
  reference: string;
  event_year: number;
  organization_name: string;
  status: string;
}
interface AccreditationRow extends QueryResultRow {
  id: string;
  event_id: string;
  event_code: string;
  category: AccreditationCategory;
  full_name: string;
  email: string;
  organization_name: string | null;
  country: string | null;
  status: AccreditationStatus;
  source_type: AccreditationSourceType;
  delegate_registration_id: string | null;
  sponsor_application_id: string | null;
  exhibitor_application_id: string | null;
  source_reference: string | null;
  source_organization_name: string | null;
  created_at: Date;
  updated_at: Date;
  approved_at: Date | null;
}

export interface NewAccreditation {
  readonly eventId: string;
  readonly category: AccreditationCategory;
  readonly fullName: string;
  readonly email: string;
  readonly organizationName: string | null;
  readonly country: string | null;
  readonly sourceType: AccreditationSourceType;
  readonly sponsorApplicationId: string | null;
  readonly exhibitorApplicationId: string | null;
  readonly createdByAdminId: string;
}

export interface AccreditationRepository {
  events(): Promise<ConferenceEvent[]>;
  findEvent(id: string, db: DatabaseExecutor): Promise<ConferenceEvent | null>;
  list(
    eventId: string,
    category?: AccreditationCategory,
    status?: AccreditationStatus,
    page?: number,
  ): Promise<AccreditationPage>;
  findById(id: string, db?: DatabaseExecutor): Promise<Accreditation | null>;
  findByIdForUpdate(
    id: string,
    db: DatabaseExecutor,
  ): Promise<Accreditation | null>;
  findApplication(
    kind: "SPONSOR" | "EXHIBITOR",
    reference: string,
    db: DatabaseExecutor,
  ): Promise<ApplicationRow | null>;
  create(input: NewAccreditation, db: DatabaseExecutor): Promise<Accreditation>;
  updateStatus(
    id: string,
    status: "APPROVED" | "REVOKED",
    actorId: string,
    now: Date,
    db: DatabaseExecutor,
  ): Promise<Accreditation>;
}

function database(db?: DatabaseExecutor): DatabaseExecutor {
  const executor = db ?? getDatabasePool();
  if (!executor) throw new Error("Database is not configured");
  return executor;
}
function event(row: EventRow): ConferenceEvent {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    year: row.event_year,
    isActive: row.is_active,
  };
}
function accreditation(row: AccreditationRow): Accreditation {
  return {
    id: row.id,
    eventId: row.event_id,
    eventCode: row.event_code,
    category: row.category,
    fullName: row.full_name,
    email: row.email,
    organizationName: row.organization_name,
    country: row.country,
    status: row.status,
    sourceType: row.source_type,
    sourceId:
      row.delegate_registration_id ??
      row.sponsor_application_id ??
      row.exhibitor_application_id,
    sourceReference: row.source_reference,
    sourceOrganizationName: row.source_organization_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
  };
}

const selection = `SELECT a.id,a.event_id,e.code AS event_code,a.category,a.full_name,a.email,
  a.organization_name,a.country,a.status,a.source_type,a.delegate_registration_id,
  a.sponsor_application_id,a.exhibitor_application_id,a.created_at,a.updated_at,a.approved_at,
  COALESCE(dr.reference,sa.reference,xa.reference) AS source_reference,
  COALESCE(sa.organization_name,xa.organization_name,dr.company_name) AS source_organization_name
  FROM event_accreditations a
  JOIN conference_events e ON e.id=a.event_id
  LEFT JOIN delegate_registrations dr ON dr.id=a.delegate_registration_id
  LEFT JOIN sponsor_applications sa ON sa.id=a.sponsor_application_id
  LEFT JOIN exhibitor_applications xa ON xa.id=a.exhibitor_application_id`;

export const postgresAccreditationRepository: AccreditationRepository = {
  async events() {
    const result = await database().query<EventRow>(
      "SELECT id,code,name,event_year,is_active FROM conference_events ORDER BY event_year DESC,code",
    );
    return result.rows.map(event);
  },
  async findEvent(id, db) {
    const result = await db.query<EventRow>(
      "SELECT id,code,name,event_year,is_active FROM conference_events WHERE id=$1",
      [id],
    );
    return result.rows[0] ? event(result.rows[0]) : null;
  },
  async list(eventId, category, status, page = 1) {
    const pageSize = 50;
    const result = await database().query<AccreditationRow>(
      `${selection} WHERE a.event_id=$1 AND ($2::text IS NULL OR a.category=$2::text)
       AND ($3::text IS NULL OR a.status=$3::text)
       ORDER BY a.created_at DESC,a.id DESC LIMIT $4 OFFSET $5`,
      [
        eventId,
        category ?? null,
        status ?? null,
        pageSize + 1,
        (page - 1) * pageSize,
      ],
    );
    return {
      accreditations: result.rows.slice(0, pageSize).map(accreditation),
      page,
      hasMore: result.rows.length > pageSize,
    };
  },
  async findById(id, db) {
    const result = await database(db).query<AccreditationRow>(
      `${selection} WHERE a.id=$1`,
      [id],
    );
    return result.rows[0] ? accreditation(result.rows[0]) : null;
  },
  async findByIdForUpdate(id, db) {
    const result = await db.query<AccreditationRow>(
      `${selection} WHERE a.id=$1 FOR UPDATE OF a`,
      [id],
    );
    return result.rows[0] ? accreditation(result.rows[0]) : null;
  },
  async findApplication(kind, reference, db) {
    const table =
      kind === "SPONSOR" ? "sponsor_applications" : "exhibitor_applications";
    const result = await db.query<ApplicationRow>(
      `SELECT id,reference,event_year,organization_name,status FROM ${table}
       WHERE reference=$1 FOR SHARE`,
      [reference],
    );
    return result.rows[0] ?? null;
  },
  async create(input, db) {
    const id = randomUUID();
    await db.query(
      `INSERT INTO event_accreditations
       (id,event_id,category,full_name,email,organization_name,country,status,source_type,
        sponsor_application_id,exhibitor_application_id,created_by_admin_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9,$10,$11)`,
      [
        id,
        input.eventId,
        input.category,
        input.fullName,
        input.email,
        input.organizationName,
        input.country,
        input.sourceType,
        input.sponsorApplicationId,
        input.exhibitorApplicationId,
        input.createdByAdminId,
      ],
    );
    const created = await this.findById(id, db);
    if (!created) throw new Error("Accreditation creation returned no record");
    return created;
  },
  async updateStatus(id, status, actorId, now, db) {
    await db.query(
      `UPDATE event_accreditations SET status=$2::varchar,updated_at=$4,
        approved_at=CASE WHEN $2::text='APPROVED' THEN $4 ELSE approved_at END,
        approved_by_admin_id=CASE WHEN $2::text='APPROVED' THEN $3 ELSE approved_by_admin_id END
       WHERE id=$1`,
      [id, status, actorId, now],
    );
    const updated = await this.findById(id, db);
    if (!updated)
      throw new Error("Accreditation status update returned no record");
    return updated;
  },
};

/** Link a newly committed 2027 delegate without copying payment or verification state. */
export async function linkDelegateAccreditation(
  registrationId: string,
  db: DatabaseExecutor,
): Promise<void> {
  const result = await db.query(
    `INSERT INTO event_accreditations
       (id,event_id,category,full_name,email,organization_name,country,status,source_type,
        delegate_registration_id)
     SELECT $1,e.id,
       CASE dr.package_type_snapshot WHEN 'STUDENT' THEN 'STUDENT_DELEGATE'
            ELSE 'PROFESSIONAL_DELEGATE' END,
       concat_ws(' ',dr.first_name,dr.last_name),dr.email,dr.company_name,dr.country,
       'LINKED','DELEGATE_REGISTRATION',dr.id
     FROM delegate_registrations dr
     JOIN conference_events e ON e.code='AIAIAC-AFRICA-2027' AND e.event_year=2027
     WHERE dr.id=$2 AND dr.package_type_snapshot IN ('PROFESSIONAL','STUDENT')
     ON CONFLICT (event_id,delegate_registration_id) DO NOTHING`,
    [randomUUID(), registrationId],
  );
  if (result.rowCount !== 1)
    throw new Error("Delegate accreditation link was not created");
}
