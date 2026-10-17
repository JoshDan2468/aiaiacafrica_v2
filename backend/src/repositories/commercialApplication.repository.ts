import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type { DatabaseExecutor, TransactionRunner } from "../types/database";
import type {
  CommercialApplicationDetail,
  CommercialApplicationInput,
  CommercialApplicationKind,
  CommercialApplicationListFilters,
  CommercialApplicationPage,
  CommercialApplicationPublicResult,
  CommercialApplicationStatus,
  CommercialApplicationTransitionResult,
  CommercialNotificationClaim,
} from "../types/commercialApplication";

export class CommercialPackageUnavailableError extends Error {}
export class CommercialApplicationNotFoundError extends Error {}
export class CommercialApplicationTransitionConflictError extends Error {}

interface KindConfig {
  kind: CommercialApplicationKind;
  packageTable: "sponsorship_packages" | "exhibition_packages";
  applications: "sponsor_applications" | "exhibitor_applications";
  history: "sponsor_application_history" | "exhibitor_application_history";
  notifications:
    "sponsor_application_notifications" | "exhibitor_application_notifications";
}

const configs: Record<CommercialApplicationKind, KindConfig> = {
  SPONSOR: {
    kind: "SPONSOR",
    packageTable: "sponsorship_packages",
    applications: "sponsor_applications",
    history: "sponsor_application_history",
    notifications: "sponsor_application_notifications",
  },
  EXHIBITOR: {
    kind: "EXHIBITOR",
    packageTable: "exhibition_packages",
    applications: "exhibitor_applications",
    history: "exhibitor_application_history",
    notifications: "exhibitor_application_notifications",
  },
};

interface ApplicationRow extends QueryResultRow {
  id: string;
  reference: string;
  organization_name: string;
  country: string;
  website: string | null;
  industry: string | null;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone: string;
  contact_job_title: string | null;
  applicant_notes: string | null;
  package_code_snapshot: string;
  package_name_snapshot: string;
  currency_snapshot: "USD";
  price_minor_snapshot: string;
  status: CommercialApplicationStatus;
  current_applicant_reason: string | null;
  reviewed_at: Date | null;
  reviewer_name: string | null;
  created_at: Date;
}

interface HistoryRow extends QueryResultRow {
  id: string;
  action: CommercialApplicationStatus;
  from_status: CommercialApplicationStatus | null;
  to_status: CommercialApplicationStatus;
  reviewer_name: string | null;
  applicant_reason: string | null;
  internal_note: string | null;
  created_at: Date;
}

interface NotificationRow extends QueryResultRow {
  id: string;
  notification_type: CommercialApplicationStatus;
  recipient_email_snapshot: string;
  recipient_name_snapshot: string;
  applicant_reason_snapshot: string | null;
  organization_name: string;
  reference: string;
  package_name_snapshot: string;
  currency_snapshot: "USD";
  price_minor_snapshot: string;
}

export interface CommercialApplicationRepository {
  create(
    kind: CommercialApplicationKind,
    input: CommercialApplicationInput,
    packageCode: string,
    reference: string,
    now: Date,
  ): Promise<CommercialApplicationPublicResult>;
  list(
    kind: CommercialApplicationKind,
    filters: CommercialApplicationListFilters,
  ): Promise<CommercialApplicationPage>;
  getDetail(
    kind: CommercialApplicationKind,
    reference: string,
  ): Promise<CommercialApplicationDetail | null>;
  transition(
    kind: CommercialApplicationKind,
    reference: string,
    nextStatus: Exclude<CommercialApplicationStatus, "SUBMITTED">,
    adminId: string,
    applicantReason: string | null,
    internalNote: string | null,
    now: Date,
  ): Promise<CommercialApplicationTransitionResult>;
  claimNotifications(
    kind: CommercialApplicationKind,
    reference: string,
    now: Date,
  ): Promise<readonly CommercialNotificationClaim[]>;
  recordNotificationResult(
    kind: CommercialApplicationKind,
    notificationId: string,
    sent: boolean,
    now: Date,
  ): Promise<void>;
}

function nextStep(kind: CommercialApplicationKind): string {
  return `Our ${kind === "SPONSOR" ? "sponsorship" : "exhibition"} team will review the application and contact you. Submission does not mean payment has been completed.`;
}

function listItem(row: ApplicationRow) {
  return {
    reference: row.reference,
    organizationName: row.organization_name,
    contactName: `${row.contact_first_name} ${row.contact_last_name}`,
    contactEmail: row.contact_email,
    packageCode: row.package_code_snapshot,
    packageName: row.package_name_snapshot,
    currency: row.currency_snapshot,
    priceMinor: Number(row.price_minor_snapshot),
    status: row.status,
    submittedAt: row.created_at,
  } as const;
}

export function createCommercialApplicationRepository(
  executor?: DatabaseExecutor,
  transactionRunner: TransactionRunner = withTransaction,
): CommercialApplicationRepository {
  const database = () => {
    const selected = executor ?? getDatabasePool();
    if (!selected) throw new Error("Database is not configured");
    return selected;
  };

  return {
    async create(kind, input, packageCode, reference, now) {
      const config = configs[kind];
      return transactionRunner(async (client) => {
        const packageResult = await client.query<{
          id: string;
          code: string;
          name: string;
          currency: "USD";
          price_minor: string;
        }>(
          `SELECT id, code, name, currency, price_minor
           FROM ${config.packageTable}
           WHERE event_year = 2027 AND code = $1 AND is_active = true`,
          [packageCode],
        );
        const selectedPackage = packageResult.rows[0];
        if (!selectedPackage) throw new CommercialPackageUnavailableError();

        const insertResult = await client.query<ApplicationRow>(
          `INSERT INTO ${config.applications} (
             id, reference, event_year, package_id, package_code_snapshot,
             package_name_snapshot, currency_snapshot, price_minor_snapshot,
             organization_name, country, website, industry, contact_first_name,
             contact_last_name, contact_email, contact_phone, contact_job_title,
             applicant_notes, consent, status, created_at, updated_at
           ) VALUES (
             $1, $2, 2027, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
             $13, $14, $15, $16, $17, true, 'SUBMITTED', $18, $18
           )
           ON CONFLICT (event_year, package_id, contact_email) DO NOTHING
           RETURNING *`,
          [
            randomUUID(),
            reference,
            selectedPackage.id,
            selectedPackage.code,
            selectedPackage.name,
            selectedPackage.currency,
            selectedPackage.price_minor,
            input.organizationName,
            input.country,
            input.website ?? null,
            input.industry ?? null,
            input.contactFirstName,
            input.contactLastName,
            input.contactEmail,
            input.contactPhone,
            input.contactJobTitle ?? null,
            input.notes ?? null,
            now,
          ],
        );
        let row = insertResult.rows[0];
        const created = Boolean(row);
        if (!row) {
          const existing = await client.query<ApplicationRow>(
            `SELECT * FROM ${config.applications}
             WHERE event_year = 2027 AND package_id = $1 AND contact_email = $2`,
            [selectedPackage.id, input.contactEmail],
          );
          row = existing.rows[0];
          if (!row) throw new Error("Duplicate application lookup failed");
        } else {
          const historyId = randomUUID();
          await client.query(
            `INSERT INTO ${config.history}
               (id, application_id, action, from_status, to_status, created_at)
             VALUES ($1, $2, 'SUBMITTED', NULL, 'SUBMITTED', $3)`,
            [historyId, row.id, now],
          );
          await client.query(
            `INSERT INTO ${config.notifications} (
               id, application_id, history_id, notification_type,
               recipient_email_snapshot, recipient_name_snapshot, status, created_at, updated_at
             ) VALUES ($1, $2, $3, 'SUBMITTED', $4, $5, 'PENDING', $6, $6)`,
            [
              randomUUID(),
              row.id,
              historyId,
              row.contact_email,
              `${row.contact_first_name} ${row.contact_last_name}`,
              now,
            ],
          );
        }
        return {
          created,
          kind,
          reference: row.reference,
          packageCode: row.package_code_snapshot,
          packageName: row.package_name_snapshot,
          currency: row.currency_snapshot,
          priceMinor: Number(row.price_minor_snapshot),
          status: row.status,
          nextStep: nextStep(kind),
        };
      });
    },

    async list(kind, filters) {
      const config = configs[kind];
      const values: unknown[] = [];
      const clauses: string[] = [];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        clauses.push(
          `(reference ILIKE $${values.length} OR organization_name ILIKE $${values.length} OR contact_email ILIKE $${values.length} OR contact_first_name || ' ' || contact_last_name ILIKE $${values.length})`,
        );
      }
      if (filters.status) {
        values.push(filters.status);
        clauses.push(`status = $${values.length}`);
      }
      if (filters.packageCode) {
        values.push(filters.packageCode);
        clauses.push(`package_code_snapshot = $${values.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const countResult = await database().query<{ total: string }>(
        `SELECT count(*)::text AS total FROM ${config.applications} ${where}`,
        values,
      );
      const total = Number(countResult.rows[0]?.total ?? 0);
      values.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
      const result = await database().query<ApplicationRow>(
        `SELECT *, NULL::varchar AS reviewer_name
         FROM ${config.applications} ${where}
         ORDER BY created_at DESC, reference DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return {
        items: result.rows.map(listItem),
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      };
    },

    async getDetail(kind, reference) {
      const config = configs[kind];
      const result = await database().query<ApplicationRow>(
        `SELECT app.*, reviewer.full_name AS reviewer_name
         FROM ${config.applications} app
         LEFT JOIN admins reviewer ON reviewer.id = app.reviewed_by_admin_id
         WHERE app.reference = $1`,
        [reference],
      );
      const row = result.rows[0];
      if (!row) return null;
      const historyResult = await database().query<HistoryRow>(
        `SELECT history.*, reviewer.full_name AS reviewer_name
         FROM ${config.history} history
         LEFT JOIN admins reviewer ON reviewer.id = history.admin_id
         WHERE history.application_id = $1
         ORDER BY history.created_at ASC, history.id ASC`,
        [row.id],
      );
      return {
        ...listItem(row),
        origin: row.origin ?? "PUBLIC",
        importSource: row.import_source ?? null,
        approvalEvidence: row.approval_evidence ?? null,
        kind,
        country: row.country,
        website: row.website,
        industry: row.industry,
        contactFirstName: row.contact_first_name,
        contactLastName: row.contact_last_name,
        contactPhone: row.contact_phone,
        contactJobTitle: row.contact_job_title,
        applicantNotes: row.applicant_notes,
        currentApplicantReason: row.current_applicant_reason,
        reviewedAt: row.reviewed_at,
        reviewerName: row.reviewer_name,
        history: historyResult.rows.map((history) => ({
          id: history.id,
          action: history.action,
          fromStatus: history.from_status,
          toStatus: history.to_status,
          reviewerName: history.reviewer_name,
          applicantReason: history.applicant_reason,
          internalNote: history.internal_note,
          createdAt: history.created_at,
        })),
      };
    },

    async transition(
      kind,
      reference,
      nextStatus,
      adminId,
      applicantReason,
      internalNote,
      now,
    ) {
      const config = configs[kind];
      return transactionRunner(async (client: PoolClient) => {
        const locked = await client.query<ApplicationRow>(
          `SELECT *, NULL::varchar AS reviewer_name
           FROM ${config.applications} WHERE reference = $1 FOR UPDATE`,
          [reference],
        );
        const row = locked.rows[0];
        if (!row) throw new CommercialApplicationNotFoundError();
        if (
          !(["SUBMITTED", "MORE_INFORMATION_REQUIRED"] as const).includes(
            row.status as "SUBMITTED" | "MORE_INFORMATION_REQUIRED",
          )
        ) {
          throw new CommercialApplicationTransitionConflictError();
        }
        if (row.status === nextStatus) {
          throw new CommercialApplicationTransitionConflictError();
        }
        await client.query(
          `UPDATE ${config.applications}
           SET status = $2, current_applicant_reason = $3, reviewed_at = $4,
               reviewed_by_admin_id = $5, updated_at = $4
           WHERE id = $1`,
          [row.id, nextStatus, applicantReason, now, adminId],
        );
        const historyId = randomUUID();
        await client.query(
          `INSERT INTO ${config.history} (
             id, application_id, action, from_status, to_status, admin_id,
             applicant_reason, internal_note, created_at
           ) VALUES ($1, $2, $3, $4, $3, $5, $6, $7, $8)`,
          [
            historyId,
            row.id,
            nextStatus,
            row.status,
            adminId,
            applicantReason,
            internalNote,
            now,
          ],
        );
        await client.query(
          `INSERT INTO ${config.notifications} (
             id, application_id, history_id, notification_type,
             recipient_email_snapshot, recipient_name_snapshot,
             applicant_reason_snapshot, status, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $8)`,
          [
            randomUUID(),
            row.id,
            historyId,
            nextStatus,
            row.contact_email,
            `${row.contact_first_name} ${row.contact_last_name}`,
            applicantReason,
            now,
          ],
        );
        return { reference, status: nextStatus, reviewedAt: now };
      });
    },

    async claimNotifications(kind, reference, now) {
      const config = configs[kind];
      return transactionRunner(async (client) => {
        const staleBefore = new Date(now.getTime() - 10 * 60_000);
        const result = await client.query<NotificationRow>(
          `SELECT notification.id, notification.notification_type,
                  notification.recipient_email_snapshot,
                  notification.recipient_name_snapshot,
                  notification.applicant_reason_snapshot,
                  app.organization_name, app.reference, app.package_name_snapshot,
                  app.currency_snapshot, app.price_minor_snapshot
           FROM ${config.notifications} notification
           JOIN ${config.applications} app ON app.id = notification.application_id
           WHERE app.reference = $1 AND notification.attempts < 3
             AND (notification.status = 'FAILED' OR
                  (notification.status = 'PENDING' AND
                   (notification.last_attempt_at IS NULL OR notification.last_attempt_at <= $2)))
           ORDER BY notification.created_at ASC
           FOR UPDATE OF notification`,
          [reference, staleBefore],
        );
        if (!result.rowCount) return [];
        await client.query(
          `UPDATE ${config.notifications}
           SET status = 'PENDING', attempts = attempts + 1,
               last_attempt_at = $2, updated_at = $2
           WHERE id = ANY($1::uuid[])`,
          [result.rows.map((row) => row.id), now],
        );
        return result.rows.map((row) => ({
          id: row.id,
          kind,
          notificationType: row.notification_type,
          email: row.recipient_email_snapshot,
          fullName: row.recipient_name_snapshot,
          organizationName: row.organization_name,
          reference: row.reference,
          packageName: row.package_name_snapshot,
          currency: row.currency_snapshot,
          priceMinor: Number(row.price_minor_snapshot),
          applicantReason: row.applicant_reason_snapshot,
        }));
      });
    },

    async recordNotificationResult(kind, notificationId, sent, now) {
      const config = configs[kind];
      await database().query(
        `UPDATE ${config.notifications}
         SET status = $2::varchar,
             sent_at = CASE WHEN $2::varchar = 'SENT' THEN $3::timestamptz ELSE NULL END,
             updated_at = $3::timestamptz
         WHERE id = $1 AND status = 'PENDING'`,
        [notificationId, sent ? "SENT" : "FAILED", now],
      );
    },
  };
}

export const postgresCommercialApplicationRepository =
  createCommercialApplicationRepository();
