import { enqueueAnalysisSafely } from "../abstracts/enqueueAnalysis";
import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type { DatabaseExecutor, TransactionRunner } from "../types/database";
import type {
  AbstractAdminDetail,
  AbstractContent,
  AbstractHistoryItem,
  AbstractListFilters,
  AbstractNotificationClaim,
  AbstractPage,
  AbstractPublicWorkspace,
  AbstractStatus,
  AbstractSubmissionInput,
} from "../types/abstractSubmission";

export class AbstractDeadlinePassedError extends Error {}
export class AbstractDuplicateError extends Error {}
export class AbstractAuthorizationError extends Error {}
export class AbstractNotFoundError extends Error {}
export class AbstractTransitionConflictError extends Error {}

interface AbstractRow extends QueryResultRow {
  id: string;
  reference: string;
  author_first_name: string;
  author_last_name: string;
  author_email: string;
  author_phone: string;
  organization_name: string;
  job_title: string | null;
  country: string;
  title: string;
  abstract_body: string;
  word_count: number;
  keywords: string | null;
  topic: AbstractPublicWorkspace["topic"];
  status: AbstractStatus;
  current_review_reason: string | null;
  content_fingerprint: string;
  continuation_token_hash: string;
  continuation_token_expires_at: Date;
  submitted_at: Date;
  resubmitted_at: Date | null;
  review_started_at: Date | null;
  decided_at: Date | null;
  reviewer_name: string | null;
  created_at: Date;
}

interface HistoryRow extends QueryResultRow {
  id: string;
  action: AbstractHistoryItem["action"];
  from_status: AbstractStatus | null;
  to_status: AbstractStatus;
  reviewer_name: string | null;
  author_visible_reason: string | null;
  internal_note: string | null;
  word_count_snapshot: number;
  created_at: Date;
}

interface NotificationRow extends QueryResultRow {
  id: string;
  notification_type: AbstractNotificationClaim["notificationType"];
  recipient_email_snapshot: string;
  recipient_name_snapshot: string;
  author_visible_reason_snapshot: string | null;
  reference: string;
  title: string;
}

export interface AbstractSubmissionRepository {
  create(
    input: AbstractSubmissionInput,
    reference: string,
    wordCount: number,
    contentFingerprint: string,
    submissionKeyHash: string,
    continuationExpiresAt: Date,
    now: Date,
  ): Promise<{ created: boolean; row: AbstractRow }>;
  findBySubmissionKey(keyHash: string): Promise<AbstractRow | null>;
  authorize(reference: string, continuationTokenHash: string, now: Date): Promise<string>;
  getPublicState(id: string): Promise<AbstractPublicWorkspace | null>;
  updateRevision(
    id: string,
    content: AbstractContent,
    wordCount: number,
    contentFingerprint: string,
    now: Date,
  ): Promise<AbstractPublicWorkspace>;
  resubmit(id: string, now: Date): Promise<AbstractPublicWorkspace>;
  list(filters: AbstractListFilters): Promise<AbstractPage>;
  getAdminDetail(reference: string): Promise<AbstractAdminDetail | null>;
  review(
    reference: string,
    action: "REVIEW_STARTED" | "REVISION_REQUIRED" | "ACCEPTED" | "REJECTED",
    adminId: string,
    authorVisibleReason: string | null,
    internalNote: string | null,
    now: Date,
  ): Promise<{ reference: string; status: AbstractStatus }>;
  claimNotifications(reference: string, now: Date): Promise<readonly AbstractNotificationClaim[]>;
  recordNotificationResult(notificationId: string, sent: boolean, now: Date): Promise<void>;
  createRecovery(
    reference: string,
    email: string | null,
    tokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<{
    email: string;
    fullName: string;
    reference: string;
    title: string;
  } | null>;
  exchangeRecovery(
    tokenHash: string,
    continuationTokenHash: string,
    continuationExpiresAt: Date,
    now: Date,
  ): Promise<{ reference: string }>;
}

function publicState(row: AbstractRow): AbstractPublicWorkspace {
  const editable = row.status === "REVISION_REQUIRED";
  return {
    reference: row.reference,
    title: row.title,
    abstractBody: row.abstract_body,
    wordCount: Number(row.word_count),
    keywords: row.keywords,
    topic: row.topic,
    status: row.status,
    submittedAt: row.submitted_at,
    resubmittedAt: row.resubmitted_at,
    currentReviewReason: row.current_review_reason,
    editingAllowed: editable,
    resubmissionAllowed: editable,
    paymentAvailable: false,
  };
}

async function recordEvent(
  client: DatabaseExecutor,
  abstractId: string,
  eventType: string,
  adminId: string | null = null,
  details: Record<string, string> = {},
): Promise<void> {
  await client.query(
    `INSERT INTO abstract_events (id, abstract_submission_id, event_type, admin_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [randomUUID(), abstractId, eventType, adminId, JSON.stringify(details)],
  );
}

async function addHistory(
  client: DatabaseExecutor,
  row: AbstractRow,
  action: AbstractHistoryItem["action"],
  fromStatus: AbstractStatus | null,
  toStatus: AbstractStatus,
  adminId: string | null,
  reason: string | null,
  note: string | null,
  now: Date,
): Promise<string> {
  const historyId = randomUUID();
  await client.query(
    `INSERT INTO abstract_submission_history (
       id, abstract_submission_id, action, from_status, to_status, admin_id,
       author_visible_reason, internal_note, title_snapshot, abstract_body_snapshot,
       word_count_snapshot, keywords_snapshot, topic_snapshot, created_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      historyId,
      row.id,
      action,
      fromStatus,
      toStatus,
      adminId,
      reason,
      note,
      row.title,
      row.abstract_body,
      row.word_count,
      row.keywords,
      row.topic,
      now,
    ],
  );
  return historyId;
}

async function queueNotification(
  client: DatabaseExecutor,
  row: AbstractRow,
  historyId: string,
  type: AbstractNotificationClaim["notificationType"],
  reason: string | null,
  now: Date,
): Promise<void> {
  await client.query(
    `INSERT INTO abstract_notifications (
       id, abstract_submission_id, history_id, notification_type,
       recipient_email_snapshot, recipient_name_snapshot,
       author_visible_reason_snapshot, status, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$8)`,
    [
      randomUUID(),
      row.id,
      historyId,
      type,
      row.author_email,
      `${row.author_first_name} ${row.author_last_name}`,
      reason,
      now,
    ],
  );
}

export function createAbstractSubmissionRepository(
  executor?: DatabaseExecutor,
  transactionRunner: TransactionRunner = withTransaction,
  enqueueAnalysis?: (
    client: DatabaseExecutor,
    submissionId: string,
    historyId: string,
  ) => Promise<void>,
): AbstractSubmissionRepository {
  const database = () => {
    const selected = executor ?? getDatabasePool();
    if (!selected) throw new Error("Database is not configured");
    return selected;
  };

  return {
    async findBySubmissionKey(keyHash) {
      const result = await database().query<AbstractRow>(
        "SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions WHERE submission_key_hash=$1",
        [keyHash],
      );
      return result.rows[0] ?? null;
    },
    async create(input, reference, wordCount, fingerprint, keyHash, expiresAt, now) {
      try {
        return await transactionRunner(async (client) => {
          const existingKey = await client.query<AbstractRow>(
            "SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions WHERE submission_key_hash = $1",
            [keyHash],
          );
          if (existingKey.rows[0]) return { created: false, row: existingKey.rows[0] };
          const duplicate = await client.query(
            `SELECT 1 FROM abstract_submissions
           WHERE event_year = 2027 AND author_email = $1 AND content_fingerprint = $2`,
            [input.authorEmail, fingerprint],
          );
          if (duplicate.rowCount) throw new AbstractDuplicateError();
          const id = randomUUID();
          const result = await client.query<AbstractRow>(
            `INSERT INTO abstract_submissions (
             id, reference, event_year, author_first_name, author_last_name,
             author_email, author_phone, organization_name, job_title, country,
             title, abstract_body, word_count, keywords, topic, status,
             content_fingerprint, submission_key_hash, continuation_token_hash,
             continuation_token_expires_at, submitted_at, created_at, updated_at
           ) VALUES ($1,$2,2027,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
             'SUBMITTED',$15,$16,$16,$17,$18,$18,$18)
           RETURNING *, NULL::varchar AS reviewer_name`,
            [
              id,
              reference,
              input.authorFirstName,
              input.authorLastName,
              input.authorEmail,
              input.authorPhone,
              input.organizationName,
              input.jobTitle ?? null,
              input.country,
              input.title,
              input.abstractBody,
              wordCount,
              input.keywords ?? null,
              input.topic ?? null,
              fingerprint,
              keyHash,
              expiresAt,
              now,
            ],
          );
          const row = result.rows[0]!;
          const historyId = await addHistory(
            client,
            row,
            "SUBMITTED",
            null,
            "SUBMITTED",
            null,
            null,
            null,
            now,
          );
          await queueNotification(client, row, historyId, "SUBMITTED", null, now);
          await recordEvent(
            client,
            id,
            "ABSTRACT_SUBMITTED",
            null,
            enqueueAnalysis ? { aiRequestedHistoryId: historyId } : {},
          );
          await enqueueAnalysisSafely(client, id, historyId, enqueueAnalysis);
          return { created: true, row };
        });
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          const existing = await this.findBySubmissionKey(keyHash);
          if (existing) return { created: false, row: existing };
          throw new AbstractDuplicateError();
        }
        throw error;
      }
    },

    async authorize(reference, tokenHash, now) {
      const result = await database().query<{ id: string }>(
        `SELECT id FROM abstract_submissions
         WHERE reference = $1 AND continuation_token_hash = $2
           AND continuation_token_expires_at > $3`,
        [reference, tokenHash, now],
      );
      const id = result.rows[0]?.id;
      if (!id) throw new AbstractAuthorizationError();
      return id;
    },

    async getPublicState(id) {
      const result = await database().query<AbstractRow>(
        "SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions WHERE id = $1",
        [id],
      );
      return result.rows[0] ? publicState(result.rows[0]) : null;
    },

    async updateRevision(id, content, wordCount, fingerprint, now) {
      return transactionRunner(async (client) => {
        const locked = await client.query<AbstractRow>(
          "SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions WHERE id = $1 FOR UPDATE",
          [id],
        );
        const row = locked.rows[0];
        if (!row) throw new AbstractNotFoundError();
        if (row.status !== "REVISION_REQUIRED") throw new AbstractTransitionConflictError();
        try {
          const updated = await client.query<AbstractRow>(
            `UPDATE abstract_submissions SET title=$2, abstract_body=$3, word_count=$4,
               keywords=$5, topic=$6, content_fingerprint=$7, updated_at=$8
             WHERE id=$1 RETURNING *, NULL::varchar AS reviewer_name`,
            [
              id,
              content.title,
              content.abstractBody,
              wordCount,
              content.keywords ?? null,
              content.topic ?? null,
              fingerprint,
              now,
            ],
          );
          return publicState(updated.rows[0]!);
        } catch (error) {
          if ((error as { code?: string }).code === "23505") throw new AbstractDuplicateError();
          throw error;
        }
      });
    },

    async resubmit(id, now) {
      return transactionRunner(async (client) => {
        const locked = await client.query<AbstractRow>(
          "SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions WHERE id=$1 FOR UPDATE",
          [id],
        );
        const row = locked.rows[0];
        if (!row) throw new AbstractNotFoundError();
        if (row.status !== "REVISION_REQUIRED") throw new AbstractTransitionConflictError();
        const updated = await client.query<AbstractRow>(
          `UPDATE abstract_submissions SET status='SUBMITTED', current_review_reason=NULL,
             reviewer_id=NULL, review_started_at=NULL, decided_at=NULL,
             resubmitted_at=$2, submitted_at=$2, updated_at=$2
           WHERE id=$1 RETURNING *, NULL::varchar AS reviewer_name`,
          [id, now],
        );
        const next = updated.rows[0]!;
        const historyId = await addHistory(
          client,
          next,
          "RESUBMITTED",
          "REVISION_REQUIRED",
          "SUBMITTED",
          null,
          null,
          null,
          now,
        );
        await queueNotification(client, next, historyId, "RESUBMITTED", null, now);
        await recordEvent(
          client,
          id,
          "ABSTRACT_RESUBMITTED",
          null,
          enqueueAnalysis ? { aiRequestedHistoryId: historyId } : {},
        );
        await enqueueAnalysisSafely(client, id, historyId, enqueueAnalysis);
        return publicState(next);
      });
    },

    async list(filters) {
      const values: unknown[] = [];
      const clauses: string[] = [];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        clauses.push(
          `(reference ILIKE $${values.length} OR title ILIKE $${values.length} OR organization_name ILIKE $${values.length} OR author_email ILIKE $${values.length} OR author_first_name || ' ' || author_last_name ILIKE $${values.length})`,
        );
      }
      if (filters.status) {
        values.push(filters.status);
        clauses.push(`status = $${values.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const totalResult = await database().query<{ total: string }>(
        `SELECT count(*)::text AS total FROM abstract_submissions ${where}`,
        values,
      );
      const total = Number(totalResult.rows[0]?.total ?? 0);
      values.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
      const result = await database().query<AbstractRow>(
        `SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions ${where}
         ORDER BY submitted_at DESC, reference DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      return {
        items: result.rows.map((row) => ({
          reference: row.reference,
          authorName: `${row.author_first_name} ${row.author_last_name}`,
          organizationName: row.organization_name,
          country: row.country,
          title: row.title,
          wordCount: Number(row.word_count),
          status: row.status,
          submittedAt: row.submitted_at,
          resubmittedAt: row.resubmitted_at,
        })),
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      };
    },

    async getAdminDetail(reference) {
      const result = await database().query<AbstractRow>(
        `SELECT abstract.*, reviewer.full_name AS reviewer_name
         FROM abstract_submissions abstract
         LEFT JOIN admins reviewer ON reviewer.id=abstract.reviewer_id
         WHERE abstract.reference=$1`,
        [reference],
      );
      const row = result.rows[0];
      if (!row) return null;
      const history = await database().query<HistoryRow>(
        `SELECT history.*, reviewer.full_name AS reviewer_name
         FROM abstract_submission_history history
         LEFT JOIN admins reviewer ON reviewer.id=history.admin_id
         WHERE history.abstract_submission_id=$1
         ORDER BY history.created_at ASC, history.id ASC`,
        [row.id],
      );
      return {
        reference: row.reference,
        authorName: `${row.author_first_name} ${row.author_last_name}`,
        authorEmail: row.author_email,
        authorPhone: row.author_phone,
        organizationName: row.organization_name,
        jobTitle: row.job_title,
        country: row.country,
        title: row.title,
        abstractBody: row.abstract_body,
        wordCount: Number(row.word_count),
        keywords: row.keywords,
        topic: row.topic,
        status: row.status,
        currentReviewReason: row.current_review_reason,
        reviewerName: row.reviewer_name,
        submittedAt: row.submitted_at,
        resubmittedAt: row.resubmitted_at,
        reviewStartedAt: row.review_started_at,
        decidedAt: row.decided_at,
        history: history.rows.map((item) => ({
          id: item.id,
          action: item.action,
          fromStatus: item.from_status,
          toStatus: item.to_status,
          reviewerName: item.reviewer_name,
          authorVisibleReason: item.author_visible_reason,
          internalNote: item.internal_note,
          wordCount: Number(item.word_count_snapshot),
          createdAt: item.created_at,
        })),
      };
    },

    async review(reference, action, adminId, reason, note, now) {
      return transactionRunner(async (client) => {
        const locked = await client.query<AbstractRow>(
          "SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions WHERE reference=$1 FOR UPDATE",
          [reference],
        );
        const row = locked.rows[0];
        if (!row) throw new AbstractNotFoundError();
        const expected = action === "REVIEW_STARTED" ? "SUBMITTED" : "UNDER_REVIEW";
        if (row.status !== expected) throw new AbstractTransitionConflictError();
        const nextStatus: AbstractStatus = action === "REVIEW_STARTED" ? "UNDER_REVIEW" : action;
        const result = await client.query<AbstractRow>(
          `UPDATE abstract_submissions SET status=$2::varchar, reviewer_id=$3,
             current_review_reason=$4,
             review_started_at=CASE WHEN $2::varchar='UNDER_REVIEW' THEN $5 ELSE review_started_at END,
             decided_at=CASE WHEN $2::varchar IN ('ACCEPTED','REJECTED') THEN $5 ELSE NULL END,
             updated_at=$5
           WHERE id=$1 RETURNING *, NULL::varchar AS reviewer_name`,
          [row.id, nextStatus, adminId, reason, now],
        );
        const next = result.rows[0]!;
        const historyId = await addHistory(
          client,
          next,
          action,
          row.status,
          nextStatus,
          adminId,
          reason,
          note,
          now,
        );
        if (action !== "REVIEW_STARTED") {
          await queueNotification(client, next, historyId, action, reason, now);
        }
        const event = {
          REVIEW_STARTED: "ABSTRACT_REVIEW_STARTED",
          REVISION_REQUIRED: "ABSTRACT_REVISION_REQUIRED",
          ACCEPTED: "ABSTRACT_ACCEPTED",
          REJECTED: "ABSTRACT_REJECTED",
        }[action]!;
        await recordEvent(client, row.id, event, adminId);
        return { reference, status: nextStatus };
      });
    },

    async claimNotifications(reference, now) {
      return transactionRunner(async (client) => {
        const stale = new Date(now.getTime() - 10 * 60_000);
        const result = await client.query<NotificationRow>(
          `SELECT notification.id, notification.notification_type,
             notification.recipient_email_snapshot, notification.recipient_name_snapshot,
             notification.author_visible_reason_snapshot, abstract.reference, abstract.title
           FROM abstract_notifications notification
           JOIN abstract_submissions abstract ON abstract.id=notification.abstract_submission_id
           WHERE abstract.reference=$1 AND notification.attempts < 3
             AND (notification.status='FAILED' OR
               (notification.status='PENDING' AND
                (notification.last_attempt_at IS NULL OR notification.last_attempt_at <= $2)))
           ORDER BY notification.created_at ASC FOR UPDATE OF notification`,
          [reference, stale],
        );
        if (!result.rowCount) return [];
        await client.query(
          `UPDATE abstract_notifications SET attempts=attempts+1, status='PENDING',
             last_attempt_at=$2, updated_at=$2 WHERE id=ANY($1::uuid[])`,
          [result.rows.map((row) => row.id), now],
        );
        return result.rows.map((row) => ({
          id: row.id,
          notificationType: row.notification_type,
          email: row.recipient_email_snapshot,
          fullName: row.recipient_name_snapshot,
          reference: row.reference,
          title: row.title,
          authorVisibleReason: row.author_visible_reason_snapshot,
        }));
      });
    },

    async recordNotificationResult(notificationId, sent, now) {
      await transactionRunner(async (client) => {
        const result = await client.query<{ abstract_submission_id: string }>(
          `UPDATE abstract_notifications SET status=$2::varchar,
             sent_at=CASE WHEN $2::varchar='SENT' THEN $3::timestamptz ELSE NULL END,
             updated_at=$3::timestamptz
           WHERE id=$1 AND status='PENDING' RETURNING abstract_submission_id`,
          [notificationId, sent ? "SENT" : "FAILED", now],
        );
        const id = result.rows[0]?.abstract_submission_id;
        if (id) {
          await recordEvent(
            client,
            id,
            sent ? "ABSTRACT_NOTIFICATION_SENT" : "ABSTRACT_NOTIFICATION_FAILED",
          );
        }
      });
    },

    async createRecovery(reference, email, tokenHash, expiresAt, now) {
      return transactionRunner(async (client) => {
        const found = await client.query<AbstractRow>(
          `SELECT *, NULL::varchar AS reviewer_name FROM abstract_submissions
           WHERE reference=$1 AND ($2::varchar IS NULL OR author_email=$2) FOR UPDATE`,
          [reference, email],
        );
        const row = found.rows[0];
        if (!row) return null;
        await client.query(
          `UPDATE abstract_recovery_tokens SET invalidated_at=$2
           WHERE abstract_submission_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL`,
          [row.id, now],
        );
        await client.query(
          `INSERT INTO abstract_recovery_tokens
             (id, abstract_submission_id, token_hash, expires_at, created_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [randomUUID(), row.id, tokenHash, expiresAt, now],
        );
        await recordEvent(client, row.id, "ABSTRACT_ACCESS_RECOVERY_REQUESTED");
        return {
          email: row.author_email,
          fullName: `${row.author_first_name} ${row.author_last_name}`,
          reference: row.reference,
          title: row.title,
        };
      });
    },

    async exchangeRecovery(tokenHash, continuationHash, continuationExpiresAt, now) {
      return transactionRunner(async (client) => {
        const result = await client.query<{
          id: string;
          abstract_submission_id: string;
          reference: string;
        }>(
          `SELECT token.id, token.abstract_submission_id, abstract.reference
           FROM abstract_recovery_tokens token
           JOIN abstract_submissions abstract ON abstract.id=token.abstract_submission_id
           WHERE token.token_hash=$1 AND token.expires_at>$2
             AND token.consumed_at IS NULL AND token.invalidated_at IS NULL
           FOR UPDATE OF token`,
          [tokenHash, now],
        );
        const token = result.rows[0];
        if (!token) throw new AbstractAuthorizationError();
        await client.query("UPDATE abstract_recovery_tokens SET consumed_at=$2 WHERE id=$1", [
          token.id,
          now,
        ]);
        await client.query(
          `UPDATE abstract_submissions SET continuation_token_hash=$2,
             continuation_token_expires_at=$3, updated_at=$4 WHERE id=$1`,
          [token.abstract_submission_id, continuationHash, continuationExpiresAt, now],
        );
        await recordEvent(client, token.abstract_submission_id, "ABSTRACT_ACCESS_RECOVERED");
        return { reference: token.reference };
      });
    },
  };
}

export const postgresAbstractSubmissionRepository = createAbstractSubmissionRepository();
