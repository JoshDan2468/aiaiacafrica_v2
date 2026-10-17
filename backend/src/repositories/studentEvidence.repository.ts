import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type {
  AuthorizedStudentEvidenceUpload,
  StoredStudentEvidence,
  StudentEvidenceCategory,
  StudentEvidenceDocumentStatus,
  StudentEvidenceList,
  StudentEvidenceMetadata,
  StudentEvidenceMimeType,
  StudentEvidenceScanStatus,
  StudentEvidenceType,
} from "../types/studentEvidence";
import { evidenceReadiness } from "../types/studentEvidence";

export class StudentEvidenceSlotOccupiedError extends Error {}
export class StudentEvidenceReplacementNotFoundError extends Error {}
export class StudentEvidenceVersionLimitError extends Error {}
export class StudentEvidenceUploadIneligibleError extends Error {}

interface EvidenceRow extends QueryResultRow {
  id: string;
  public_id: string;
  student_verification_id: string;
  registration_reference: string;
  evidence_type: StudentEvidenceType;
  evidence_category: StudentEvidenceCategory;
  original_display_filename: string;
  storage_key: string;
  detected_mime_type: StudentEvidenceMimeType;
  size_bytes: number;
  sha256_checksum: string;
  scan_status: StudentEvidenceScanStatus;
  document_status: StudentEvidenceDocumentStatus;
  superseded_at: Date | null;
  uploaded_at: Date;
}

export interface CreatePendingStudentEvidenceInput {
  readonly studentVerificationId: string;
  readonly publicId: string;
  readonly evidenceType: StudentEvidenceType;
  readonly category: StudentEvidenceCategory;
  readonly displayFilename: string;
  readonly storageKey: string;
  readonly detectedMimeType: StudentEvidenceMimeType;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly replacementEvidenceId?: string | undefined;
}

export interface StudentEvidenceRepository {
  authorizeContinuation(
    registrationReference: string,
    tokenHash: string,
    now: Date,
  ): Promise<AuthorizedStudentEvidenceUpload | null>;
  createPending(
    input: CreatePendingStudentEvidenceInput,
  ): Promise<StoredStudentEvidence>;
  completeScan(
    evidenceId: string,
    scanStatus: Exclude<StudentEvidenceScanStatus, "PENDING">,
    documentStatus: StudentEvidenceDocumentStatus,
  ): Promise<StudentEvidenceMetadata>;
  listCurrent(studentVerificationId: string): Promise<StudentEvidenceList>;
  findAvailableForAdmin(
    registrationReference: string,
    evidenceId: string,
  ): Promise<StoredStudentEvidence | null>;
  recordAccess(evidence: StoredStudentEvidence, adminId: string): Promise<void>;
}

function requireDatabasePool() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

function mapMetadata(row: EvidenceRow): StudentEvidenceMetadata {
  return {
    evidenceId: row.public_id,
    evidenceType: row.evidence_type,
    category: row.evidence_category,
    displayFilename: row.original_display_filename,
    detectedMimeType: row.detected_mime_type,
    sizeBytes: row.size_bytes,
    checksumSha256: row.sha256_checksum,
    scanStatus: row.scan_status,
    documentStatus: row.document_status,
    uploadedAt: row.uploaded_at,
  };
}

function mapStored(row: EvidenceRow): StoredStudentEvidence {
  return {
    ...mapMetadata(row),
    id: row.id,
    studentVerificationId: row.student_verification_id,
    registrationReference: row.registration_reference,
    storageKey: row.storage_key,
    supersededAt: row.superseded_at,
  };
}

const evidenceSelect = `
  SELECT sed.id, sed.public_id, sed.student_verification_id,
         dr.reference AS registration_reference, sed.evidence_type,
         sed.evidence_category, sed.original_display_filename, sed.storage_key,
         sed.detected_mime_type, sed.size_bytes, sed.sha256_checksum,
         sed.scan_status, sed.document_status, sed.superseded_at, sed.uploaded_at
  FROM student_evidence_documents sed
  JOIN student_verifications sv ON sv.id = sed.student_verification_id
  JOIN delegate_registrations dr ON dr.id = sv.registration_id`;

async function recordEvent(
  client: Pick<PoolClient, "query">,
  verificationId: string,
  eventType:
    | "STUDENT_EVIDENCE_UPLOADED"
    | "STUDENT_EVIDENCE_REPLACED"
    | "STUDENT_EVIDENCE_SCAN_COMPLETED"
    | "STUDENT_EVIDENCE_REJECTED"
    | "STUDENT_EVIDENCE_ACCESSED",
  details: Readonly<Record<string, string | boolean>>,
  adminId?: string,
): Promise<void> {
  await client.query(
    `INSERT INTO student_verification_events (
       id, student_verification_id, event_type, admin_id, details
     ) VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      randomUUID(),
      verificationId,
      eventType,
      adminId ?? null,
      JSON.stringify(details),
    ],
  );
}

export const postgresStudentEvidenceRepository: StudentEvidenceRepository = {
  async authorizeContinuation(registrationReference, tokenHash, now) {
    const result = await requireDatabasePool().query<{
      id: string;
      reference: string;
      status: AuthorizedStudentEvidenceUpload["verificationStatus"];
    }>(
      `SELECT sv.id, dr.reference, sv.status
       FROM student_verifications sv
       JOIN delegate_registrations dr ON dr.id = sv.registration_id
       WHERE dr.reference = $1
         AND dr.package_type_snapshot = 'STUDENT'
         AND sv.continuation_token_hash = $2
         AND sv.continuation_token_expires_at > $3`,
      [registrationReference, tokenHash, now],
    );
    const row = result.rows[0];
    return row
      ? {
          studentVerificationId: row.id,
          registrationReference: row.reference,
          verificationStatus: row.status,
        }
      : null;
  },

  async createPending(input) {
    return withTransaction(async (client) => {
      const verification = await client.query<{ status: string }>(
        `SELECT status FROM student_verifications WHERE id = $1 FOR UPDATE`,
        [input.studentVerificationId],
      );
      if (
        !["NOT_SUBMITTED", "MORE_INFORMATION_REQUIRED"].includes(
          verification.rows[0]?.status ?? "",
        )
      ) {
        throw new StudentEvidenceUploadIneligibleError();
      }

      const versions = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM student_evidence_documents
         WHERE student_verification_id = $1 AND evidence_category = $2`,
        [input.studentVerificationId, input.category],
      );
      if (Number(versions.rows[0]?.count ?? 0) >= 3) {
        throw new StudentEvidenceVersionLimitError();
      }

      const active = await client.query<{ id: string; public_id: string }>(
        `SELECT id, public_id FROM student_evidence_documents
         WHERE student_verification_id = $1 AND evidence_category = $2
           AND superseded_at IS NULL
         FOR UPDATE`,
        [input.studentVerificationId, input.category],
      );
      const replaced = active.rows[0] ?? null;
      if (input.replacementEvidenceId) {
        if (!replaced || replaced.public_id !== input.replacementEvidenceId) {
          throw new StudentEvidenceReplacementNotFoundError();
        }
      } else if (replaced) {
        throw new StudentEvidenceSlotOccupiedError();
      }

      const now = new Date();
      if (replaced) {
        await client.query(
          `UPDATE student_evidence_documents
           SET superseded_at = $2, updated_at = $2
           WHERE id = $1`,
          [replaced.id, now],
        );
      }

      const id = randomUUID();
      await client.query(
        `INSERT INTO student_evidence_documents (
           id, public_id, student_verification_id, evidence_type,
           evidence_category, original_display_filename, storage_key,
           detected_mime_type, size_bytes, sha256_checksum,
           scan_status, document_status, supersedes_evidence_id, uploaded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           'PENDING', 'PENDING_SCAN', $11, $12
         )`,
        [
          id,
          input.publicId,
          input.studentVerificationId,
          input.evidenceType,
          input.category,
          input.displayFilename,
          input.storageKey,
          input.detectedMimeType,
          input.sizeBytes,
          input.checksumSha256,
          replaced?.id ?? null,
          now,
        ],
      );
      await recordEvent(
        client,
        input.studentVerificationId,
        "STUDENT_EVIDENCE_UPLOADED",
        {
          evidenceId: input.publicId,
          evidenceType: input.evidenceType,
        },
      );
      if (replaced) {
        await recordEvent(
          client,
          input.studentVerificationId,
          "STUDENT_EVIDENCE_REPLACED",
          {
            evidenceId: input.publicId,
            replacedEvidenceId: replaced.public_id,
          },
        );
      }
      const result = await client.query<EvidenceRow>(
        `${evidenceSelect} WHERE sed.id = $1`,
        [id],
      );
      const row = result.rows[0];
      if (!row) throw new Error("Evidence creation returned no record");
      return mapStored(row);
    });
  },

  async completeScan(evidenceId, scanStatus, documentStatus) {
    return withTransaction(async (client) => {
      const result = await client.query<EvidenceRow>(
        `${evidenceSelect} WHERE sed.public_id = $1 FOR UPDATE OF sed`,
        [evidenceId],
      );
      const row = result.rows[0];
      if (!row)
        throw new Error("Evidence record not found during scan completion");
      const updated = await client.query<EvidenceRow>(
        `UPDATE student_evidence_documents sed
         SET scan_status = $2, document_status = $3, updated_at = current_timestamp
         FROM student_verifications sv, delegate_registrations dr
         WHERE sed.public_id = $1
           AND sv.id = sed.student_verification_id
           AND dr.id = sv.registration_id
         RETURNING sed.id, sed.public_id, sed.student_verification_id,
           dr.reference AS registration_reference, sed.evidence_type,
           sed.evidence_category, sed.original_display_filename, sed.storage_key,
           sed.detected_mime_type, sed.size_bytes, sed.sha256_checksum,
           sed.scan_status, sed.document_status, sed.superseded_at, sed.uploaded_at`,
        [evidenceId, scanStatus, documentStatus],
      );
      await recordEvent(
        client,
        row.student_verification_id,
        "STUDENT_EVIDENCE_SCAN_COMPLETED",
        {
          evidenceId,
          scanStatus,
        },
      );
      if (scanStatus === "INFECTED") {
        await recordEvent(
          client,
          row.student_verification_id,
          "STUDENT_EVIDENCE_REJECTED",
          {
            evidenceId,
            reason: "INFECTED",
          },
        );
      }
      const updatedRow = updated.rows[0];
      if (!updatedRow)
        throw new Error("Evidence scan update returned no record");
      return mapMetadata(updatedRow);
    });
  },

  async listCurrent(studentVerificationId) {
    const result = await requireDatabasePool().query<EvidenceRow>(
      `${evidenceSelect}
       WHERE sed.student_verification_id = $1 AND sed.superseded_at IS NULL
       ORDER BY sed.evidence_category, sed.uploaded_at DESC`,
      [studentVerificationId],
    );
    const items = result.rows.map(mapMetadata);
    return { items, readiness: evidenceReadiness(items) };
  },

  async findAvailableForAdmin(registrationReference, evidenceId) {
    const result = await requireDatabasePool().query<EvidenceRow>(
      `${evidenceSelect}
       WHERE dr.reference = $1 AND sed.public_id = $2
         AND sed.superseded_at IS NULL
         AND sed.document_status = 'AVAILABLE' AND sed.scan_status = 'CLEAN'`,
      [registrationReference, evidenceId],
    );
    return result.rows[0] ? mapStored(result.rows[0]) : null;
  },

  async recordAccess(evidence, adminId) {
    await recordEvent(
      requireDatabasePool(),
      evidence.studentVerificationId,
      "STUDENT_EVIDENCE_ACCESSED",
      { evidenceId: evidence.evidenceId, evidenceType: evidence.evidenceType },
      adminId,
    );
  },
};
