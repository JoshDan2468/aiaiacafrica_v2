export const commercialApplicationKinds = ["SPONSOR", "EXHIBITOR"] as const;
export type CommercialApplicationKind =
  (typeof commercialApplicationKinds)[number];

export const commercialApplicationStatuses = [
  "SUBMITTED",
  "MORE_INFORMATION_REQUIRED",
  "CONFIRMED",
  "DECLINED",
] as const;
export type CommercialApplicationStatus =
  (typeof commercialApplicationStatuses)[number];

export const sponsorshipTierCodes = [
  "TITLE",
  "STRATEGIC",
  "DIAMOND",
  "PLATINUM",
  "GOLD",
  "SILVER",
] as const;
export type SponsorshipTierCode = (typeof sponsorshipTierCodes)[number];

export const exhibitionOptionCodes = ["9_SQM", "18_SQM", "36_SQM"] as const;
export type ExhibitionOptionCode = (typeof exhibitionOptionCodes)[number];

export interface CommercialApplicationInput {
  readonly organizationName: string;
  readonly country: string;
  readonly website?: string | undefined;
  readonly industry?: string | undefined;
  readonly contactFirstName: string;
  readonly contactLastName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly contactJobTitle?: string | undefined;
  readonly notes?: string | undefined;
  readonly consent: true;
}

export interface SponsorApplicationInput extends CommercialApplicationInput {
  readonly sponsorshipTier: SponsorshipTierCode;
}

export interface ExhibitorApplicationInput extends CommercialApplicationInput {
  readonly exhibitionOption: ExhibitionOptionCode;
}

export interface CommercialApplicationPublicResult {
  readonly created: boolean;
  readonly kind: CommercialApplicationKind;
  readonly reference: string;
  readonly packageCode: string;
  readonly packageName: string;
  readonly currency: "USD";
  readonly priceMinor: number;
  readonly status: CommercialApplicationStatus;
  readonly nextStep: string;
}

export interface CommercialApplicationListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: CommercialApplicationStatus;
  readonly packageCode?: string;
}

export interface CommercialApplicationListItem {
  readonly reference: string;
  readonly organizationName: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly packageCode: string;
  readonly packageName: string;
  readonly currency: "USD";
  readonly priceMinor: number;
  readonly status: CommercialApplicationStatus;
  readonly submittedAt: Date;
}

export interface CommercialApplicationHistoryItem {
  readonly id: string;
  readonly action: CommercialApplicationStatus;
  readonly fromStatus: CommercialApplicationStatus | null;
  readonly toStatus: CommercialApplicationStatus;
  readonly reviewerName: string | null;
  readonly applicantReason: string | null;
  readonly internalNote: string | null;
  readonly createdAt: Date;
}

export interface CommercialApplicationDetail extends CommercialApplicationListItem {
  readonly origin?: "PUBLIC" | "MANUAL_IMPORT";
  readonly importSource?: string | null;
  readonly approvalEvidence?: string | null;
  readonly kind: CommercialApplicationKind;
  readonly country: string;
  readonly website: string | null;
  readonly industry: string | null;
  readonly contactFirstName: string;
  readonly contactLastName: string;
  readonly contactPhone: string;
  readonly contactJobTitle: string | null;
  readonly applicantNotes: string | null;
  readonly currentApplicantReason: string | null;
  readonly reviewedAt: Date | null;
  readonly reviewerName: string | null;
  readonly history: readonly CommercialApplicationHistoryItem[];
}

export interface CommercialApplicationPage {
  readonly items: readonly CommercialApplicationListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface CommercialApplicationTransitionResult {
  readonly reference: string;
  readonly status: CommercialApplicationStatus;
  readonly reviewedAt: Date;
}

export interface CommercialNotificationClaim {
  readonly id: string;
  readonly kind: CommercialApplicationKind;
  readonly notificationType: CommercialApplicationStatus;
  readonly email: string;
  readonly fullName: string;
  readonly organizationName: string;
  readonly reference: string;
  readonly packageName: string;
  readonly currency: "USD";
  readonly priceMinor: number;
  readonly applicantReason: string | null;
}
