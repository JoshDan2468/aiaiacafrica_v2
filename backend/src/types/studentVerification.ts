import type {
  StudentEvidenceMetadata,
  StudentEvidenceReadiness,
} from "./studentEvidence";

export const studentVerificationStatuses = [
  "NOT_SUBMITTED",
  "PENDING",
  "MORE_INFORMATION_REQUIRED",
  "APPROVED",
  "REJECTED",
] as const;

export type StudentVerificationStatus =
  (typeof studentVerificationStatuses)[number];

export const studentVerificationActions = [
  "SUBMITTED",
  "RESUBMITTED",
  "MORE_INFORMATION_REQUIRED",
  "APPROVED",
  "REJECTED",
] as const;

export type StudentVerificationAction =
  (typeof studentVerificationActions)[number];

export interface StudentApplicationInput {
  readonly packageId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly mobile: string;
  readonly telephone?: string | undefined;
  readonly country: string;
  readonly mainObjective: string;
  readonly heardAboutSource: string;
  readonly privacyConsent: true;
  readonly dataSharingConsent: boolean;
  readonly institutionName: string;
  readonly institutionCountry: string;
  readonly programmeOfStudy: string;
  readonly studentIdentificationNumber: string;
  readonly expectedGraduationYear: number;
  readonly institutionalEmail?: string | undefined;
}

export interface CreatedStudentApplication {
  readonly reference: string;
  readonly registrationStatus: "SUBMITTED";
  readonly paymentStatus: "PENDING";
  readonly verificationStatus: "NOT_SUBMITTED";
  readonly paymentAvailable: false;
  readonly continuationToken: string;
  readonly continuationTokenExpiresAt: Date;
  readonly email: string;
  readonly emailVerificationStatus: "UNVERIFIED";
  readonly verificationEmailSent?: boolean | undefined;
}

export interface StudentVerificationListItem {
  readonly registrationReference: string;
  readonly delegateName: string;
  readonly institutionName: string;
  readonly institutionCountry: string;
  readonly programmeOfStudy: string;
  readonly verificationStatus: StudentVerificationStatus;
  readonly emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  readonly submittedAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly createdAt: Date;
  readonly evidence: readonly StudentEvidenceMetadata[];
  readonly evidenceReadiness: StudentEvidenceReadiness;
}

export interface StudentVerificationHistoryItem {
  readonly id: string;
  readonly action: StudentVerificationAction;
  readonly fromStatus: StudentVerificationStatus;
  readonly toStatus: StudentVerificationStatus;
  readonly reviewerName: string | null;
  readonly note: string | null;
  readonly createdAt: Date;
}

export interface StudentVerificationPublicState {
  readonly registrationReference: string;
  readonly verificationStatus: StudentVerificationStatus;
  readonly submittedAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly latestReviewReason: string | null;
  readonly evidence: readonly StudentEvidenceMetadata[];
  readonly evidenceReadiness: StudentEvidenceReadiness;
  readonly evidenceEditingAllowed: boolean;
  readonly submissionAllowed: boolean;
  readonly paymentAvailable: boolean;
  readonly emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  readonly paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  readonly availablePrices?: readonly { currency: "USD" | "NGN"; amountMinor: number }[];
}

export interface StudentVerificationAdminDetail extends StudentVerificationPublicState {
  readonly delegateName: string;
  readonly email: string;
  readonly institutionName: string;
  readonly institutionCountry: string;
  readonly programmeOfStudy: string;
  readonly studentIdentificationNumber: string;
  readonly expectedGraduationYear: number;
  readonly institutionalEmail: string | null;
  readonly createdAt: Date;
  readonly history: readonly StudentVerificationHistoryItem[];
}

export interface StudentVerificationTransitionResult {
  readonly registrationReference: string;
  readonly verificationStatus: StudentVerificationStatus;
}

export interface StudentRecoveryRecipient {
  readonly registrationReference: string;
  readonly email: string;
  readonly fullName: string;
}

export interface StudentNotificationClaim {
  readonly id: string;
  readonly verificationId: string;
  readonly notificationType: StudentVerificationAction;
  readonly registrationReference: string;
  readonly email: string;
  readonly fullName: string;
  readonly note: string | null;
}

export interface StudentVerificationListFilters {
  readonly page: number;
  readonly limit: number;
  readonly search?: string | undefined;
  readonly status?: StudentVerificationStatus | undefined;
}

export interface StudentVerificationListResult {
  readonly items: StudentVerificationListItem[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export const validStudentVerificationTransitions: Readonly<
  Record<StudentVerificationStatus, readonly StudentVerificationStatus[]>
> = {
  NOT_SUBMITTED: ["PENDING"],
  PENDING: ["APPROVED", "REJECTED", "MORE_INFORMATION_REQUIRED"],
  MORE_INFORMATION_REQUIRED: ["PENDING"],
  APPROVED: [],
  REJECTED: [],
};

export function canTransitionStudentVerification(
  from: StudentVerificationStatus,
  to: StudentVerificationStatus,
): boolean {
  return validStudentVerificationTransitions[from].includes(to);
}
