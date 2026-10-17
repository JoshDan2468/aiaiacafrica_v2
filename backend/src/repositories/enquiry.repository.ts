import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type { DatabaseExecutor, TransactionRunner } from "../types/database";
import type {
  EnquiryAdminDetail,
  EnquiryDecision,
  EnquiryInput,
  EnquiryListFilters,
  EnquiryNotificationClaim,
  EnquiryNotificationRole,
  EnquiryPage,
  EnquiryStatus,
} from "../types/enquiry";

export class EnquiryDuplicateKeyError extends Error {}
export class EnquiryNotFoundError extends Error {}
export class EnquiryTransitionConflictError extends Error {}

interface EnquiryRow extends QueryResultRow {
  id: string;
  reference: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  country: string | null;
  category: EnquiryInput["category"];
  subject: string;
  message: string;
  status: EnquiryStatus;
  payload_fingerprint: string;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  closed_at: Date | null;
}

interface HistoryRow extends QueryResultRow {
  id: string;
  action: "SUBMITTED" | EnquiryDecision;
  from_status: EnquiryStatus | null;
  to_status: EnquiryStatus;
  admin_name: string | null;
  internal_note: string | null;
  created_at: Date;
}

interface NotificationRow extends QueryResultRow {
  id: string;
  recipient_kind: EnquiryNotificationClaim["recipientKind"];
  recipient_email: string;
  recipient_name: string;
  reference: string;
  category: EnquiryInput["category"];
  subject: string;
  first_name: string;
  last_name: string;
  created_at: Date;
}

export interface EnquiryRepository {
  create(
    input: EnquiryInput,
    reference: string,
    keyHash: string,
    fingerprint: string,
    notificationRoles: readonly EnquiryNotificationRole[],
    now: Date,
  ): Promise<{ created: boolean; row: EnquiryRow }>;
  list(filters: EnquiryListFilters): Promise<EnquiryPage>;
  getDetail(reference: string): Promise<EnquiryAdminDetail | null>;
  transition(
    reference: string,
    nextStatus: EnquiryDecision,
    adminId: string,
    note: string | null,
    now: Date,
  ): Promise<{ reference: string; status: EnquiryStatus }>;
  claimNotifications(
    reference: string,
    now: Date,
  ): Promise<readonly EnquiryNotificationClaim[]>;
  recordNotificationResult(id: string, sent: boolean, now: Date): Promise<void>;
}

async function recordEvent(
  client: DatabaseExecutor,
  enquiryId: string,
  eventType: string,
  adminId: string | null = null,
): Promise<void> {
  await client.query(
    `INSERT INTO enquiry_events (id, enquiry_id, event_type, admin_id) VALUES ($1,$2,$3,$4)`,
    [randomUUID(), enquiryId, eventType, adminId],
  );
}

export function createEnquiryRepository(
  executor?: DatabaseExecutor,
  transactionRunner: TransactionRunner = withTransaction,
): EnquiryRepository {
  const database = () => {
    const selected = executor ?? getDatabasePool();
    if (!selected) throw new Error("Database is not configured");
    return selected;
  };

  return {
    async create(
      input,
      reference,
      keyHash,
      fingerprint,
      notificationRoles,
      now,
    ) {
      return transactionRunner(async (client) => {
        const inserted = await client.query<EnquiryRow>(
          `INSERT INTO enquiries (
            id,reference,event_year,first_name,last_name,email,phone,organization,country,
            category,subject,message,status,submission_key_hash,payload_fingerprint,created_at,updated_at
          ) VALUES ($1,$2,2027,$3,$4,$5,$6,$7,$8,$9,$10,$11,'OPEN',$12,$13,$14,$14)
          ON CONFLICT (submission_key_hash) DO NOTHING RETURNING *`,
          [
            randomUUID(),
            reference,
            input.firstName,
            input.lastName,
            input.email,
            input.phone ?? null,
            input.organization ?? null,
            input.country ?? null,
            input.category,
            input.subject,
            input.message,
            keyHash,
            fingerprint,
            now,
          ],
        );
        const row = inserted.rows[0];
        if (!row) {
          const existing = await client.query<EnquiryRow>(
            `SELECT * FROM enquiries WHERE submission_key_hash=$1`,
            [keyHash],
          );
          const previous = existing.rows[0];
          if (!previous || previous.payload_fingerprint !== fingerprint)
            throw new EnquiryDuplicateKeyError();
          return { created: false, row: previous };
        }
        await client.query(
          `INSERT INTO enquiry_history (id,enquiry_id,action,from_status,to_status,created_at)
           VALUES ($1,$2,'SUBMITTED',NULL,'OPEN',$3)`,
          [randomUUID(), row.id, now],
        );
        await client.query(
          `INSERT INTO enquiry_notifications
            (id,enquiry_id,recipient_kind,recipient_email,recipient_name,status,created_at,updated_at)
           VALUES ($1,$2,'ACKNOWLEDGEMENT',$3,$4,'PENDING',$5,$5)`,
          [
            randomUUID(),
            row.id,
            row.email,
            `${row.first_name} ${row.last_name}`,
            now,
          ],
        );
        if (notificationRoles.length) {
          const recipients = await client.query<{
            id: string;
            full_name: string;
            email: string;
          }>(
            `SELECT id,full_name,email FROM admins WHERE is_active=true AND role=ANY($1::text[])`,
            [notificationRoles],
          );
          for (const recipient of recipients.rows) {
            await client.query(
              `INSERT INTO enquiry_notifications
                (id,enquiry_id,recipient_kind,recipient_email,recipient_name,status,created_at,updated_at)
               VALUES ($1,$2,'INTERNAL',$3,$4,'PENDING',$5,$5)`,
              [randomUUID(), row.id, recipient.email, recipient.full_name, now],
            );
          }
        }
        await recordEvent(client, row.id, "ENQUIRY_SUBMITTED");
        return { created: true, row };
      });
    },

    async list(filters) {
      const values: unknown[] = [];
      const clauses: string[] = [];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        clauses.push(
          `(reference ILIKE $${values.length} OR subject ILIKE $${values.length} OR email ILIKE $${values.length} OR first_name || ' ' || last_name ILIKE $${values.length})`,
        );
      }
      if (filters.category) {
        values.push(filters.category);
        clauses.push(`category=$${values.length}`);
      }
      if (filters.status) {
        values.push(filters.status);
        clauses.push(`status=$${values.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const totalResult = await database().query<{ total: string }>(
        `SELECT count(*)::text AS total FROM enquiries ${where}`,
        values,
      );
      const total = Number(totalResult.rows[0]?.total ?? 0);
      values.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
      const result = await database().query<EnquiryRow>(
        `SELECT * FROM enquiries ${where} ORDER BY created_at DESC,reference DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return {
        items: result.rows.map((row) => ({
          reference: row.reference,
          sender: `${row.first_name} ${row.last_name}`,
          email: row.email,
          category: row.category,
          subject: row.subject,
          status: row.status,
          submittedAt: row.created_at,
        })),
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      };
    },

    async getDetail(reference) {
      const found = await database().query<EnquiryRow>(
        `SELECT * FROM enquiries WHERE reference=$1`,
        [reference],
      );
      const row = found.rows[0];
      if (!row) return null;
      const history = await database().query<HistoryRow>(
        `SELECT history.*,admin.full_name AS admin_name FROM enquiry_history history
         LEFT JOIN admins admin ON admin.id=history.admin_id
         WHERE history.enquiry_id=$1 ORDER BY history.created_at ASC,history.id ASC`,
        [row.id],
      );
      return {
        reference: row.reference,
        sender: `${row.first_name} ${row.last_name}`,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        organization: row.organization,
        country: row.country,
        category: row.category,
        subject: row.subject,
        message: row.message,
        status: row.status,
        submittedAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at,
        closedAt: row.closed_at,
        history: history.rows.map((item) => ({
          id: item.id,
          action: item.action,
          fromStatus: item.from_status,
          toStatus: item.to_status,
          adminName: item.admin_name,
          internalNote: item.internal_note,
          createdAt: item.created_at,
        })),
      };
    },

    async transition(reference, nextStatus, adminId, note, now) {
      return transactionRunner(async (client) => {
        const locked = await client.query<EnquiryRow>(
          `SELECT * FROM enquiries WHERE reference=$1 FOR UPDATE`,
          [reference],
        );
        const row = locked.rows[0];
        if (!row) throw new EnquiryNotFoundError();
        const permitted: Record<EnquiryStatus, readonly EnquiryDecision[]> = {
          OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
          IN_PROGRESS: ["RESOLVED", "CLOSED"],
          RESOLVED: ["CLOSED"],
          CLOSED: [],
        };
        if (!permitted[row.status].includes(nextStatus))
          throw new EnquiryTransitionConflictError();
        await client.query(
          `UPDATE enquiries SET status=$2::varchar,updated_at=$3,
             resolved_at=CASE WHEN $2::varchar='RESOLVED' THEN $3 ELSE resolved_at END,
             closed_at=CASE WHEN $2::varchar='CLOSED' THEN $3 ELSE closed_at END
           WHERE id=$1`,
          [row.id, nextStatus, now],
        );
        await client.query(
          `INSERT INTO enquiry_history
            (id,enquiry_id,action,from_status,to_status,admin_id,internal_note,created_at)
           VALUES ($1,$2,$3,$4,$3,$5,$6,$7)`,
          [randomUUID(), row.id, nextStatus, row.status, adminId, note, now],
        );
        await recordEvent(client, row.id, `ENQUIRY_${nextStatus}`, adminId);
        return { reference, status: nextStatus };
      });
    },

    async claimNotifications(reference, now) {
      return transactionRunner(async (client) => {
        const stale = new Date(now.getTime() - 10 * 60_000);
        const result = await client.query<NotificationRow>(
          `SELECT notification.id,notification.recipient_kind,notification.recipient_email,
             notification.recipient_name,enquiry.reference,enquiry.category,enquiry.subject,
             enquiry.first_name,enquiry.last_name,enquiry.created_at
           FROM enquiry_notifications notification
           JOIN enquiries enquiry ON enquiry.id=notification.enquiry_id
           WHERE enquiry.reference=$1 AND notification.attempts<3
             AND (notification.status='FAILED' OR
               (notification.status='PENDING' AND
                (notification.last_attempt_at IS NULL OR notification.last_attempt_at<=$2)))
           ORDER BY notification.created_at ASC FOR UPDATE OF notification`,
          [reference, stale],
        );
        if (!result.rowCount) return [];
        await client.query(
          `UPDATE enquiry_notifications SET attempts=attempts+1,status='PENDING',
             last_attempt_at=$2,updated_at=$2 WHERE id=ANY($1::uuid[])`,
          [result.rows.map((row) => row.id), now],
        );
        return result.rows.map((row) => ({
          id: row.id,
          recipientKind: row.recipient_kind,
          email: row.recipient_email,
          name: row.recipient_name,
          reference: row.reference,
          category: row.category,
          subject: row.subject,
          sender: `${row.first_name} ${row.last_name}`,
          submittedAt: row.created_at,
        }));
      });
    },

    async recordNotificationResult(id, sent, now) {
      await transactionRunner(async (client) => {
        const result = await client.query<{ enquiry_id: string }>(
          `UPDATE enquiry_notifications SET status=$2::varchar,
             sent_at=CASE WHEN $2::varchar='SENT' THEN $3::timestamptz ELSE NULL END,
             updated_at=$3::timestamptz
           WHERE id=$1 AND status='PENDING' RETURNING enquiry_id`,
          [id, sent ? "SENT" : "FAILED", now],
        );
        const enquiryId = result.rows[0]?.enquiry_id;
        if (enquiryId)
          await recordEvent(
            client,
            enquiryId,
            sent ? "ENQUIRY_NOTIFICATION_SENT" : "ENQUIRY_NOTIFICATION_FAILED",
          );
      });
    },
  };
}

export const postgresEnquiryRepository = createEnquiryRepository();
