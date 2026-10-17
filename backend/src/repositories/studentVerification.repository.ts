import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { withTransaction, getDatabasePool } from "../config/database";
import { linkDelegateAccreditation } from "./accreditation.repository";
import {
  DelegatePackageUnavailableError,
  DelegateReferenceCollisionError,
  DuplicateDelegateRegistrationError,
} from "./delegate.repository";
import type {
  CreatedStudentApplication,
  StudentApplicationInput,
  StudentVerificationListFilters,
  StudentVerificationListItem,
  StudentVerificationListResult,
  StudentVerificationStatus,
} from "../types/studentVerification";

interface StudentPackageRow extends QueryResultRow {
  id: string;
  name: string;
  delegate_type: "STUDENT";
  description: string;
  benefits: string[];
}

interface StudentVerificationRow extends QueryResultRow {
  registration_reference: string;
  delegate_name: string;
  institution_name: string;
  institution_country: string;
  programme_of_study: string;
  status: StudentVerificationStatus;
  email_verification_status: "UNVERIFIED" | "VERIFIED";
  submitted_at: Date | null;
  reviewed_at: Date | null;
  created_at: Date;
  evidence_documents: Array<{
    evidenceId: string;
    evidenceType: import("../types/studentEvidence").StudentEvidenceType;
    category: import("../types/studentEvidence").StudentEvidenceCategory;
    displayFilename: string;
    detectedMimeType: import("../types/studentEvidence").StudentEvidenceMimeType;
    sizeBytes: number;
    checksumSha256: string;
    scanStatus: import("../types/studentEvidence").StudentEvidenceScanStatus;
    documentStatus: import("../types/studentEvidence").StudentEvidenceDocumentStatus;
    uploadedAt: string;
  }>;
  has_available_student_id: boolean;
  has_available_enrolment_evidence: boolean;
}

export interface StudentVerificationRepository {
  createApplication(
    input: StudentApplicationInput,
    nextReference: () => string,
    continuation: { readonly tokenHash: string; readonly expiresAt: Date },
  ): Promise<
    Omit<
      CreatedStudentApplication,
      "continuationToken" | "continuationTokenExpiresAt"
    >
  >;
  list(
    filters: StudentVerificationListFilters,
  ): Promise<StudentVerificationListResult>;
}

function requireDatabasePool() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === constraint
  );
}

function mapListItem(row: StudentVerificationRow): StudentVerificationListItem {
  return {
    registrationReference: row.registration_reference,
    delegateName: row.delegate_name,
    institutionName: row.institution_name,
    institutionCountry: row.institution_country,
    programmeOfStudy: row.programme_of_study,
    verificationStatus: row.status,
    emailVerificationStatus: row.email_verification_status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    evidence: row.evidence_documents.map((document) => ({
      ...document,
      uploadedAt: new Date(document.uploadedAt),
    })),
    evidenceReadiness: {
      hasAvailableStudentId: row.has_available_student_id,
      hasAvailableEnrolmentEvidence: row.has_available_enrolment_evidence,
      minimumEvidenceReady:
        row.has_available_student_id && row.has_available_enrolment_evidence,
    },
  };
}

export const postgresStudentVerificationRepository: StudentVerificationRepository =
  {
    async createApplication(input, nextReference, continuation) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          return await withTransaction(async (client) => {
            const now = new Date();
            const packageResult = await client.query<StudentPackageRow>(
              `SELECT id, name, delegate_type, description, benefits
               FROM delegate_packages
               WHERE id = $1 AND delegate_type = 'STUDENT' AND is_active = true
                 AND (sales_start_at IS NULL OR sales_start_at <= $2)
                 AND (sales_end_at IS NULL OR sales_end_at >= $2)
               FOR SHARE`,
              [input.packageId, now],
            );
            const selectedPackage = packageResult.rows[0];
            if (!selectedPackage) throw new DelegatePackageUnavailableError();

            const duplicate = await client.query(
              `SELECT 1 FROM delegate_registrations
               WHERE package_id = $1 AND email = $2 LIMIT 1`,
              [input.packageId, input.email],
            );
            if (duplicate.rowCount)
              throw new DuplicateDelegateRegistrationError();

            const registrationId = randomUUID();
            const verificationId = randomUUID();
            const reference = nextReference();
            await client.query(
              `INSERT INTO delegate_registrations (
                 id, reference, package_id, first_name, last_name, email, mobile,
                 telephone, job_title, company_name, country, primary_activity,
                 main_objective, heard_about_source, privacy_consent,
                 data_sharing_consent, registration_status, payment_status,
                 package_name_snapshot, package_type_snapshot,
                 package_description_snapshot, package_benefits_snapshot,
                 currency_snapshot, price_minor_snapshot, submitted_at
               ) VALUES (
                 $1, $2, $3, $4, $5, $6, $7, $8, 'Student', $9, $10, $11,
                 $12, $13, true, $14, 'SUBMITTED', 'PENDING', $15, 'STUDENT',
                 $16, $17, NULL, NULL, $18
               )`,
              [
                registrationId,
                reference,
                selectedPackage.id,
                input.firstName,
                input.lastName,
                input.email,
                input.mobile,
                input.telephone ?? null,
                input.institutionName,
                input.country,
                input.programmeOfStudy,
                input.mainObjective,
                input.heardAboutSource,
                input.dataSharingConsent,
                selectedPackage.name,
                selectedPackage.description,
                selectedPackage.benefits,
                now,
              ],
            );
            await client.query(
              `INSERT INTO student_verifications (
                 id, registration_id, institution_name, institution_country,
                 programme_of_study, student_identification_number,
                 expected_graduation_year, institutional_email, status,
                 continuation_token_hash, continuation_token_expires_at
               ) VALUES (
                 $1, $2, $3, $4, $5, $6, $7, $8, 'NOT_SUBMITTED', $9, $10
               )`,
              [
                verificationId,
                registrationId,
                input.institutionName,
                input.institutionCountry,
                input.programmeOfStudy,
                input.studentIdentificationNumber,
                input.expectedGraduationYear,
                input.institutionalEmail ?? null,
                continuation.tokenHash,
                continuation.expiresAt,
              ],
            );
            await client.query(
              `INSERT INTO student_verification_events (
                 id, student_verification_id, event_type, details
               ) VALUES ($1, $2, 'STUDENT_APPLICATION_CREATED', '{}'::jsonb)`,
              [randomUUID(), verificationId],
            );
            await linkDelegateAccreditation(registrationId, client);
            return {
              reference,
              registrationStatus: "SUBMITTED",
              paymentStatus: "PENDING",
              verificationStatus: "NOT_SUBMITTED",
              paymentAvailable: false,
              email: input.email,
              emailVerificationStatus: "UNVERIFIED",
            };
          });
        } catch (error) {
          if (
            isUniqueViolation(
              error,
              "delegate_registrations_package_email_unique",
            )
          ) {
            throw new DuplicateDelegateRegistrationError();
          }
          if (isUniqueViolation(error, "delegate_registrations_reference_key"))
            continue;
          throw error;
        }
      }
      throw new DelegateReferenceCollisionError();
    },

    async list(filters) {
      const values: unknown[] = [];
      const clauses: string[] = [];
      if (filters.search) {
        values.push(`%${filters.search}%`);
        const value = `$${values.length}`;
        clauses.push(
          `(dr.reference ILIKE ${value} OR dr.first_name ILIKE ${value} OR ` +
            `dr.last_name ILIKE ${value} OR sv.institution_name ILIKE ${value})`,
        );
      }
      if (filters.status) {
        values.push(filters.status);
        clauses.push(`sv.status = $${values.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const pool = requireDatabasePool();
      const count = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM student_verifications sv
         JOIN delegate_registrations dr ON dr.id = sv.registration_id
         ${where}`,
        values,
      );
      const pageValues = [
        ...values,
        filters.limit,
        (filters.page - 1) * filters.limit,
      ];
      const result = await pool.query<StudentVerificationRow>(
        `SELECT dr.reference AS registration_reference,
                concat_ws(' ', dr.first_name, dr.last_name) AS delegate_name,
                sv.institution_name, sv.institution_country,
                sv.programme_of_study, sv.status, dr.email_verification_status,
                sv.submitted_at,
                sv.reviewed_at, sv.created_at,
                evidence.evidence_documents,
                evidence.has_available_student_id,
                evidence.has_available_enrolment_evidence
         FROM student_verifications sv
         JOIN delegate_registrations dr ON dr.id = sv.registration_id
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
             COALESCE(
               bool_or(
                 sed.evidence_category = 'STUDENT_ID'
                 AND sed.scan_status = 'CLEAN'
                 AND sed.document_status = 'AVAILABLE'
               ),
               false
             ) AS has_available_student_id,
             COALESCE(
               bool_or(
                 sed.evidence_category = 'ENROLMENT'
                 AND sed.scan_status = 'CLEAN'
                 AND sed.document_status = 'AVAILABLE'
               ),
               false
             ) AS has_available_enrolment_evidence
           FROM student_evidence_documents sed
           WHERE sed.student_verification_id = sv.id
             AND sed.superseded_at IS NULL
         ) evidence ON true
         ${where}
         ORDER BY sv.created_at DESC, sv.id DESC
         LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
        pageValues,
      );
      return {
        items: result.rows.map(mapListItem),
        total: Number(count.rows[0]?.count ?? 0),
        page: filters.page,
        limit: filters.limit,
      };
    },
  };
