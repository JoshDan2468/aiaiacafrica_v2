import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import { evidenceReadiness } from "../types/studentEvidence";
import type {
  StudentEvidenceCategory,
  StudentEvidenceDocumentStatus,
  StudentEvidenceMetadata,
  StudentEvidenceMimeType,
  StudentEvidenceScanStatus,
  StudentEvidenceType,
} from "../types/studentEvidence";
import type {
  StudentNotificationClaim,
  StudentRecoveryRecipient,
  StudentVerificationAction,
  StudentVerificationAdminDetail,
  StudentVerificationHistoryItem,
  StudentVerificationPublicState,
  StudentVerificationStatus,
  StudentVerificationTransitionResult,
} from "../types/studentVerification";

export class StudentVerificationTransitionConflictError extends Error {}
export class StudentVerificationEvidenceNotReadyError extends Error {}
export class StudentVerificationNotFoundError extends Error {}
export class StudentRecoveryTokenInvalidError extends Error {}

interface WorkflowRow extends QueryResultRow {
  id: string;
  registration_reference: string;
  delegate_name: string;
  email: string;
  institution_name: string;
  institution_country: string;
  programme_of_study: string;
  student_identification_number: string;
  expected_graduation_year: number;
  institutional_email: string | null;
  status: StudentVerificationStatus;
  registration_status: string;
  email_verification_status: "UNVERIFIED" | "VERIFIED";
  payment_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  available_prices: { currency: "USD" | "NGN"; amountMinor: number }[];
  submitted_at: Date | null;
  reviewed_at: Date | null;
  review_note: string | null;
  created_at: Date;
  evidence_documents: EvidenceJson[];
  has_available_student_id: boolean;
  has_available_enrolment_evidence: boolean;
}

interface EvidenceJson {
  evidenceId: string;
  evidenceType: StudentEvidenceType;
  category: StudentEvidenceCategory;
  displayFilename: string;
  detectedMimeType: StudentEvidenceMimeType;
  sizeBytes: number;
  checksumSha256: string;
  scanStatus: StudentEvidenceScanStatus;
  documentStatus: StudentEvidenceDocumentStatus;
  uploadedAt: string;
}

interface HistoryRow extends QueryResultRow {
  id: string;
  action: StudentVerificationAction;
  from_status: StudentVerificationStatus;
  to_status: StudentVerificationStatus;
  reviewer_name: string | null;
  note: string | null;
  created_at: Date;
}

interface TransitionRow extends QueryResultRow {
  id: string;
  registration_reference: string;
  delegate_name: string;
  email: string;
  status: StudentVerificationStatus;
  has_available_student_id: boolean;
  has_available_enrolment_evidence: boolean;
}

interface RecoveryRow extends QueryResultRow {
  id: string;
  student_verification_id: string;
  registration_reference: string;
  email: string;
  full_name: string;
}

interface NotificationRow extends QueryResultRow {
  id: string;
  student_verification_id: string;
  notification_type: StudentVerificationAction;
  registration_reference: string;
  recipient_email_snapshot: string;
  recipient_name_snapshot: string;
  note: string | null;
}

export interface StudentVerificationWorkflowRepository {
  getPublicState(
    studentVerificationId: string,
  ): Promise<StudentVerificationPublicState | null>;
  getAdminDetail(
    registrationReference: string,
  ): Promise<StudentVerificationAdminDetail | null>;
  submit(
    studentVerificationId: string,
    now: Date,
  ): Promise<StudentVerificationTransitionResult>;
  review(
    registrationReference: string,
    action: "MORE_INFORMATION_REQUIRED" | "APPROVED" | "REJECTED",
    adminId: string,
    note: string | null,
    now: Date,
  ): Promise<StudentVerificationTransitionResult>;
  createRecovery(
    registrationReference: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<StudentRecoveryRecipient | null>;
  exchangeRecovery(
    tokenHash: string,
    continuationTokenHash: string,
    continuationExpiresAt: Date,
    now: Date,
  ): Promise<StudentRecoveryRecipient>;
  claimNotifications(
    registrationReference: string,
    now: Date,
  ): Promise<StudentNotificationClaim[]>;
  recordNotificationResult(
    notificationId: string,
    sent: boolean,
  ): Promise<void>;
}

function requireDatabasePool() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

const evidenceAggregation = `
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'evidenceId', sed.public_id,
            'evidenceType', sed.evidence_type,
            'category', sed.evidence_category,
            'displayFilename', sed.original_display_filename,
            'detectedMimeType', sed.detected_mime_type,
            'sizeBytes', sed.size_bytes,
            'checksumSha256', sed.sha256_checksum,
            'scanStatus', sed.scan_status,
            'documentStatus', sed.document_status,
            'uploadedAt', sed.uploaded_at
          ) ORDER BY sed.evidence_category, sed.uploaded_at DESC
        ),
        '[]'::jsonb
      ) AS evidence_documents,
      COALESCE(bool_or(
        sed.evidence_category = 'STUDENT_ID'
        AND sed.scan_status = 'CLEAN'
        AND sed.document_status = 'AVAILABLE'
      ), false) AS has_available_student_id,
      COALESCE(bool_or(
        sed.evidence_category = 'ENROLMENT'
        AND sed.scan_status = 'CLEAN'
        AND sed.document_status = 'AVAILABLE'
      ), false) AS has_available_enrolment_evidence
    FROM student_evidence_documents sed
    WHERE sed.student_verification_id = sv.id
      AND sed.superseded_at IS NULL
  ) evidence ON true`;

const workflowSelect = `
  SELECT sv.id, dr.reference AS registration_reference,
         concat_ws(' ', dr.first_name, dr.last_name) AS delegate_name,
         dr.email, sv.institution_name, sv.institution_country,
         sv.programme_of_study, sv.student_identification_number,
         sv.expected_graduation_year, sv.institutional_email,
         sv.status, dr.registration_status, dr.payment_status,
         dr.email_verification_status,
         sv.submitted_at, sv.reviewed_at, sv.review_note,
         sv.created_at, evidence.evidence_documents,
         evidence.has_available_student_id,
         evidence.has_available_enrolment_evidence,
         COALESCE(pricing.available_prices, '[]'::jsonb) AS available_prices
  FROM student_verifications sv
  JOIN delegate_registrations dr ON dr.id = sv.registration_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('currency', currency, 'amountMinor', amount_minor)
      ORDER BY CASE currency WHEN 'USD' THEN 0 ELSE 1 END) AS available_prices
    FROM delegate_package_prices
    WHERE package_id = dr.package_id AND is_active = true
  ) pricing ON true
  ${evidenceAggregation}`;

const transitionSelect = `
  SELECT sv.id, dr.reference AS registration_reference,
         concat_ws(' ', dr.first_name, dr.last_name) AS delegate_name,
         dr.email, sv.status,
         EXISTS (
           SELECT 1 FROM student_evidence_documents sed
           WHERE sed.student_verification_id = sv.id
             AND sed.superseded_at IS NULL
             AND sed.evidence_category = 'STUDENT_ID'
             AND sed.scan_status = 'CLEAN'
             AND sed.document_status = 'AVAILABLE'
         ) AS has_available_student_id,
         EXISTS (
           SELECT 1 FROM student_evidence_documents sed
           WHERE sed.student_verification_id = sv.id
             AND sed.superseded_at IS NULL
             AND sed.evidence_category = 'ENROLMENT'
             AND sed.scan_status = 'CLEAN'
             AND sed.document_status = 'AVAILABLE'
         ) AS has_available_enrolment_evidence
  FROM student_verifications sv
  JOIN delegate_registrations dr ON dr.id = sv.registration_id`;

function mapEvidence(
  documents: readonly EvidenceJson[],
): StudentEvidenceMetadata[] {
  return documents.map((document) => ({
    ...document,
    uploadedAt: new Date(document.uploadedAt),
  }));
}

function mapPublicState(row: WorkflowRow): StudentVerificationPublicState {
  const evidence = mapEvidence(row.evidence_documents);
  const readiness = evidenceReadiness(evidence);
  const evidenceEditingAllowed = [
    "NOT_SUBMITTED",
    "MORE_INFORMATION_REQUIRED",
  ].includes(row.status);
  return {
    registrationReference: row.registration_reference,
    verificationStatus: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    latestReviewReason: row.review_note,
    evidence,
    evidenceReadiness: readiness,
    evidenceEditingAllowed,
    submissionAllowed: evidenceEditingAllowed && readiness.minimumEvidenceReady,
    paymentAvailable:
      row.status === "APPROVED" &&
      row.email_verification_status === "VERIFIED" &&
      !["REJECTED", "CANCELLED"].includes(row.registration_status) &&
      row.payment_status !== "PAID" &&
      row.available_prices.length > 0,
    paymentStatus: row.payment_status,
    emailVerificationStatus: row.email_verification_status,
    availablePrices: row.available_prices,
  };
}

function mapHistory(row: HistoryRow): StudentVerificationHistoryItem {
  return {
    id: row.id,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reviewerName: row.reviewer_name,
    note: row.note,
    createdAt: row.created_at,
  };
}

async function recordEvent(
  client: PoolClient,
  verificationId: string,
  eventType:
    | "STUDENT_VERIFICATION_SUBMITTED"
    | "STUDENT_VERIFICATION_RESUBMITTED"
    | "STUDENT_MORE_INFORMATION_REQUIRED"
    | "STUDENT_VERIFICATION_APPROVED"
    | "STUDENT_VERIFICATION_REJECTED"
    | "STUDENT_VERIFICATION_RECOVERY_REQUESTED"
    | "STUDENT_VERIFICATION_ACCESS_RECOVERED"
    | "STUDENT_VERIFICATION_NOTIFICATION_SENT"
    | "STUDENT_VERIFICATION_NOTIFICATION_FAILED",
  adminId: string | null = null,
  details: Readonly<Record<string, string>> = {},
) {
  await client.query(
    `INSERT INTO student_verification_events (
       id, student_verification_id, event_type, admin_id, details
     ) VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [randomUUID(), verificationId, eventType, adminId, JSON.stringify(details)],
  );
}

async function createHistoryAndNotification(
  client: PoolClient,
  input: {
    verification: TransitionRow;
    action: StudentVerificationAction;
    fromStatus: StudentVerificationStatus;
    toStatus: StudentVerificationStatus;
    adminId: string | null;
    note: string | null;
    now: Date;
  },
) {
  const historyId = randomUUID();
  await client.query(
    `INSERT INTO student_verification_history (
       id, student_verification_id, action, from_status, to_status,
       admin_id, note, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      historyId,
      input.verification.id,
      input.action,
      input.fromStatus,
      input.toStatus,
      input.adminId,
      input.note,
      input.now,
    ],
  );
  await client.query(
    `INSERT INTO student_verification_notifications (
       id, student_verification_id, history_id, notification_type,
       recipient_email_snapshot, recipient_name_snapshot
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (history_id) DO NOTHING`,
    [
      randomUUID(),
      input.verification.id,
      historyId,
      input.action,
      input.verification.email,
      input.verification.delegate_name,
    ],
  );
}

export const postgresStudentVerificationWorkflowRepository: StudentVerificationWorkflowRepository =
  {
    async getPublicState(studentVerificationId) {
      const result = await requireDatabasePool().query<WorkflowRow>(
        `${workflowSelect} WHERE sv.id = $1`,
        [studentVerificationId],
      );
      return result.rows[0] ? mapPublicState(result.rows[0]) : null;
    },

    async getAdminDetail(registrationReference) {
      const result = await requireDatabasePool().query<WorkflowRow>(
        `${workflowSelect}
         WHERE dr.reference = $1 AND dr.package_type_snapshot = 'STUDENT'`,
        [registrationReference],
      );
      const row = result.rows[0];
      if (!row) return null;
      const history = await requireDatabasePool().query<HistoryRow>(
        `SELECT svh.id, svh.action, svh.from_status, svh.to_status,
                a.full_name AS reviewer_name, svh.note, svh.created_at
         FROM student_verification_history svh
         LEFT JOIN admins a ON a.id = svh.admin_id
         WHERE svh.student_verification_id = $1
         ORDER BY svh.created_at ASC, svh.id ASC`,
        [row.id],
      );
      return {
        ...mapPublicState(row),
        delegateName: row.delegate_name,
        email: row.email,
        institutionName: row.institution_name,
        institutionCountry: row.institution_country,
        programmeOfStudy: row.programme_of_study,
        studentIdentificationNumber: row.student_identification_number,
        expectedGraduationYear: row.expected_graduation_year,
        institutionalEmail: row.institutional_email,
        createdAt: row.created_at,
        history: history.rows.map(mapHistory),
      };
    },

    async submit(studentVerificationId, now) {
      return withTransaction(async (client) => {
        const result = await client.query<TransitionRow>(
          `${transitionSelect} WHERE sv.id = $1 FOR UPDATE OF sv`,
          [studentVerificationId],
        );
        const verification = result.rows[0];
        if (!verification) throw new StudentVerificationNotFoundError();
        if (
          !["NOT_SUBMITTED", "MORE_INFORMATION_REQUIRED"].includes(
            verification.status,
          )
        ) {
          throw new StudentVerificationTransitionConflictError();
        }
        if (
          !verification.has_available_student_id ||
          !verification.has_available_enrolment_evidence
        ) {
          throw new StudentVerificationEvidenceNotReadyError();
        }
        const fromStatus = verification.status;
        const action =
          fromStatus === "NOT_SUBMITTED" ? "SUBMITTED" : "RESUBMITTED";
        await client.query(
          `UPDATE student_verifications
           SET status = 'PENDING', submitted_at = $2, reviewed_at = NULL,
               reviewed_by_admin_id = NULL, review_note = NULL, updated_at = $2
           WHERE id = $1`,
          [verification.id, now],
        );
        await createHistoryAndNotification(client, {
          verification,
          action,
          fromStatus,
          toStatus: "PENDING",
          adminId: null,
          note: null,
          now,
        });
        await recordEvent(
          client,
          verification.id,
          action === "SUBMITTED"
            ? "STUDENT_VERIFICATION_SUBMITTED"
            : "STUDENT_VERIFICATION_RESUBMITTED",
        );
        return {
          registrationReference: verification.registration_reference,
          verificationStatus: "PENDING",
        };
      });
    },

    async review(registrationReference, action, adminId, note, now) {
      return withTransaction(async (client) => {
        const result = await client.query<TransitionRow>(
          `${transitionSelect}
           WHERE dr.reference = $1 AND dr.package_type_snapshot = 'STUDENT'
           FOR UPDATE OF sv`,
          [registrationReference],
        );
        const verification = result.rows[0];
        if (!verification) throw new StudentVerificationNotFoundError();
        if (verification.status !== "PENDING") {
          throw new StudentVerificationTransitionConflictError();
        }
        if (
          action === "APPROVED" &&
          (!verification.has_available_student_id ||
            !verification.has_available_enrolment_evidence)
        ) {
          throw new StudentVerificationEvidenceNotReadyError();
        }
        await client.query(
          `UPDATE student_verifications
           SET status = $2, reviewed_at = $3, reviewed_by_admin_id = $4,
               review_note = $5, updated_at = $3
           WHERE id = $1`,
          [verification.id, action, now, adminId, note],
        );
        await createHistoryAndNotification(client, {
          verification,
          action,
          fromStatus: "PENDING",
          toStatus: action,
          adminId,
          note,
          now,
        });
        const eventType =
          action === "APPROVED"
            ? "STUDENT_VERIFICATION_APPROVED"
            : action === "REJECTED"
              ? "STUDENT_VERIFICATION_REJECTED"
              : "STUDENT_MORE_INFORMATION_REQUIRED";
        await recordEvent(client, verification.id, eventType, adminId, {
          decision: action,
        });
        return {
          registrationReference: verification.registration_reference,
          verificationStatus: action,
        };
      });
    },

    async createRecovery(
      registrationReference,
      email,
      tokenHash,
      expiresAt,
      now,
    ) {
      return withTransaction(async (client) => {
        const result = await client.query<RecoveryRow>(
          `SELECT sv.id, sv.id AS student_verification_id,
                  dr.reference AS registration_reference, dr.email,
                  concat_ws(' ', dr.first_name, dr.last_name) AS full_name
           FROM student_verifications sv
           JOIN delegate_registrations dr ON dr.id = sv.registration_id
           WHERE dr.reference = $1 AND dr.email = $2
             AND dr.package_type_snapshot = 'STUDENT'
           FOR UPDATE OF sv`,
          [registrationReference, email],
        );
        const recovery = result.rows[0];
        if (!recovery) return null;
        await client.query(
          `UPDATE student_verification_recovery_tokens
           SET invalidated_at = $2
           WHERE student_verification_id = $1
             AND consumed_at IS NULL AND invalidated_at IS NULL`,
          [recovery.student_verification_id, now],
        );
        await client.query(
          `INSERT INTO student_verification_recovery_tokens (
             id, student_verification_id, token_hash, expires_at, created_at
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            randomUUID(),
            recovery.student_verification_id,
            tokenHash,
            expiresAt,
            now,
          ],
        );
        await recordEvent(
          client,
          recovery.student_verification_id,
          "STUDENT_VERIFICATION_RECOVERY_REQUESTED",
        );
        return {
          registrationReference: recovery.registration_reference,
          email: recovery.email,
          fullName: recovery.full_name,
        };
      });
    },

    async exchangeRecovery(
      tokenHash,
      continuationTokenHash,
      continuationExpiresAt,
      now,
    ) {
      return withTransaction(async (client) => {
        const result = await client.query<RecoveryRow>(
          `SELECT svrt.id, sv.id AS student_verification_id,
                  dr.reference AS registration_reference, dr.email,
                  concat_ws(' ', dr.first_name, dr.last_name) AS full_name
           FROM student_verification_recovery_tokens svrt
           JOIN student_verifications sv ON sv.id = svrt.student_verification_id
           JOIN delegate_registrations dr ON dr.id = sv.registration_id
           WHERE svrt.token_hash = $1 AND svrt.expires_at > $2
             AND svrt.consumed_at IS NULL AND svrt.invalidated_at IS NULL
           FOR UPDATE OF svrt, sv`,
          [tokenHash, now],
        );
        const recovery = result.rows[0];
        if (!recovery) throw new StudentRecoveryTokenInvalidError();
        await client.query(
          `UPDATE student_verification_recovery_tokens
           SET consumed_at = $2 WHERE id = $1`,
          [recovery.id, now],
        );
        await client.query(
          `UPDATE student_verifications
           SET continuation_token_hash = $2,
               continuation_token_expires_at = $3,
               updated_at = $4
           WHERE id = $1`,
          [
            recovery.student_verification_id,
            continuationTokenHash,
            continuationExpiresAt,
            now,
          ],
        );
        await recordEvent(
          client,
          recovery.student_verification_id,
          "STUDENT_VERIFICATION_ACCESS_RECOVERED",
        );
        return {
          registrationReference: recovery.registration_reference,
          email: recovery.email,
          fullName: recovery.full_name,
        };
      });
    },

    async claimNotifications(registrationReference, now) {
      return withTransaction(async (client) => {
        const staleBefore = new Date(now.getTime() - 10 * 60_000);
        const result = await client.query<NotificationRow>(
          `SELECT svn.id, svn.student_verification_id, svn.notification_type,
                  dr.reference AS registration_reference,
                  svn.recipient_email_snapshot, svn.recipient_name_snapshot,
                  svh.note
           FROM student_verification_notifications svn
           JOIN student_verification_history svh ON svh.id = svn.history_id
           JOIN student_verifications sv ON sv.id = svn.student_verification_id
           JOIN delegate_registrations dr ON dr.id = sv.registration_id
           WHERE dr.reference = $1 AND svn.attempts < 3
             AND (
               svn.status IN ('NOT_QUEUED', 'FAILED') OR
               (svn.status = 'PENDING' AND
                 (svn.last_attempt_at IS NULL OR svn.last_attempt_at <= $2))
             )
           ORDER BY svn.created_at ASC
           FOR UPDATE OF svn`,
          [registrationReference, staleBefore],
        );
        if (!result.rowCount) return [];
        await client.query(
          `UPDATE student_verification_notifications
           SET status = 'PENDING', attempts = attempts + 1,
               last_attempt_at = $2, updated_at = $2
           WHERE id = ANY($1::uuid[])`,
          [result.rows.map((row) => row.id), now],
        );
        return result.rows.map((row) => ({
          id: row.id,
          verificationId: row.student_verification_id,
          notificationType: row.notification_type,
          registrationReference: row.registration_reference,
          email: row.recipient_email_snapshot,
          fullName: row.recipient_name_snapshot,
          note: row.note,
        }));
      });
    },

    async recordNotificationResult(notificationId, sent) {
      await withTransaction(async (client) => {
        const result = await client.query<{
          student_verification_id: string;
        }>(
          `UPDATE student_verification_notifications
           SET status = $2::varchar,
               sent_at = CASE WHEN $2::varchar = 'SENT' THEN current_timestamp ELSE NULL END,
               updated_at = current_timestamp
           WHERE id = $1 AND status = 'PENDING'
           RETURNING student_verification_id`,
          [notificationId, sent ? "SENT" : "FAILED"],
        );
        const row = result.rows[0];
        if (row) {
          await recordEvent(
            client,
            row.student_verification_id,
            sent
              ? "STUDENT_VERIFICATION_NOTIFICATION_SENT"
              : "STUDENT_VERIFICATION_NOTIFICATION_FAILED",
          );
        }
      });
    },
  };
