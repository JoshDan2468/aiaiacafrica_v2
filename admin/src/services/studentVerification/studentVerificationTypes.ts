import type { StudentVerificationStatus } from "@/services/delegate/delegateTypes";
export type { StudentVerificationStatus } from "@/services/delegate/delegateTypes";

export type StudentEvidenceType =
  | "CURRENT_STUDENT_ID"
  | "COURSE_REGISTRATION"
  | "ENROLMENT_LETTER"
  | "TUITION_OR_SCHOOL_FEE_RECEIPT"
  | "TRANSCRIPT_OR_ENROLMENT_STATEMENT"
  | "OTHER_INSTITUTIONAL_ENROLMENT_EVIDENCE";

export interface StudentEvidenceMetadata {
  evidenceId: string;
  evidenceType: StudentEvidenceType;
  category: "STUDENT_ID" | "ENROLMENT";
  displayFilename: string;
  detectedMimeType: "application/pdf" | "image/jpeg" | "image/png";
  sizeBytes: number;
  checksumSha256: string;
  scanStatus: "PENDING" | "CLEAN" | "INFECTED" | "UNAVAILABLE" | "ERROR";
  documentStatus: "PENDING_SCAN" | "AVAILABLE" | "REJECTED";
  uploadedAt: string;
}

export interface StudentEvidenceReadiness {
  hasAvailableStudentId: boolean;
  hasAvailableEnrolmentEvidence: boolean;
  minimumEvidenceReady: boolean;
}

export interface StudentEvidenceList {
  items: StudentEvidenceMetadata[];
  readiness: StudentEvidenceReadiness;
}

export interface StudentVerificationPublicState {
  registrationReference: string;
  verificationStatus: StudentVerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  latestReviewReason: string | null;
  evidence: StudentEvidenceMetadata[];
  evidenceReadiness: StudentEvidenceReadiness;
  evidenceEditingAllowed: boolean;
  submissionAllowed: boolean;
  paymentAvailable: boolean;
  emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  availablePrices?: { currency: "USD" | "NGN"; amountMinor: number }[];
}
