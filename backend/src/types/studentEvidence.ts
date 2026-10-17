import type { StudentVerificationStatus } from "./studentVerification";

export const studentEvidenceTypes = [
  "CURRENT_STUDENT_ID",
  "COURSE_REGISTRATION",
  "ENROLMENT_LETTER",
  "TUITION_OR_SCHOOL_FEE_RECEIPT",
  "TRANSCRIPT_OR_ENROLMENT_STATEMENT",
  "OTHER_INSTITUTIONAL_ENROLMENT_EVIDENCE",
] as const;

export type StudentEvidenceType = (typeof studentEvidenceTypes)[number];
export type StudentEvidenceCategory = "STUDENT_ID" | "ENROLMENT";
export type StudentEvidenceScanStatus =
  "PENDING" | "CLEAN" | "INFECTED" | "UNAVAILABLE" | "ERROR";
export type StudentEvidenceDocumentStatus =
  "PENDING_SCAN" | "AVAILABLE" | "REJECTED";
export type StudentEvidenceMimeType =
  "application/pdf" | "image/jpeg" | "image/png";

export interface StudentEvidenceMetadata {
  readonly evidenceId: string;
  readonly evidenceType: StudentEvidenceType;
  readonly category: StudentEvidenceCategory;
  readonly displayFilename: string;
  readonly detectedMimeType: StudentEvidenceMimeType;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly scanStatus: StudentEvidenceScanStatus;
  readonly documentStatus: StudentEvidenceDocumentStatus;
  readonly uploadedAt: Date;
}

export interface StudentEvidenceReadiness {
  readonly hasAvailableStudentId: boolean;
  readonly hasAvailableEnrolmentEvidence: boolean;
  readonly minimumEvidenceReady: boolean;
}

export interface StudentEvidenceList {
  readonly items: StudentEvidenceMetadata[];
  readonly readiness: StudentEvidenceReadiness;
}

export interface AuthorizedStudentEvidenceUpload {
  readonly studentVerificationId: string;
  readonly registrationReference: string;
  readonly verificationStatus: StudentVerificationStatus;
}

export interface StoredStudentEvidence extends StudentEvidenceMetadata {
  readonly id: string;
  readonly studentVerificationId: string;
  readonly registrationReference: string;
  readonly storageKey: string;
  readonly supersededAt: Date | null;
}

export interface ValidatedStudentEvidenceFile {
  readonly displayFilename: string;
  readonly detectedMimeType: StudentEvidenceMimeType;
  readonly canonicalExtension: ".pdf" | ".jpg" | ".png";
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly bytes: Buffer;
}

export function evidenceCategoryFor(
  type: StudentEvidenceType,
): StudentEvidenceCategory {
  return type === "CURRENT_STUDENT_ID" ? "STUDENT_ID" : "ENROLMENT";
}

export function evidenceReadiness(
  items: readonly StudentEvidenceMetadata[],
): StudentEvidenceReadiness {
  const hasAvailableStudentId = items.some(
    (item) =>
      item.category === "STUDENT_ID" && item.documentStatus === "AVAILABLE",
  );
  const hasAvailableEnrolmentEvidence = items.some(
    (item) =>
      item.category === "ENROLMENT" && item.documentStatus === "AVAILABLE",
  );
  return {
    hasAvailableStudentId,
    hasAvailableEnrolmentEvidence,
    minimumEvidenceReady:
      hasAvailableStudentId && hasAvailableEnrolmentEvidence,
  };
}
