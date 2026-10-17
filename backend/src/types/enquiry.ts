export const enquiryCategories = [
  "GENERAL",
  "REGISTRATION",
  "SPONSORSHIP",
  "EXHIBITION",
  "MEDIA",
  "SPEAKER_ABSTRACT",
  "PARTNERSHIP",
  "OTHER",
] as const;
export type EnquiryCategory = (typeof enquiryCategories)[number];

export const enquiryStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];
export type EnquiryDecision = Exclude<EnquiryStatus, "OPEN">;
export type EnquiryNotificationRole =
  "SUPER_ADMIN" | "ADMIN" | "REGISTRATION_MANAGER" | "COMMUNICATIONS";

export interface EnquiryInput {
  readonly idempotencyKey: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string | undefined;
  readonly organization?: string | undefined;
  readonly country?: string | undefined;
  readonly category: EnquiryCategory;
  readonly subject: string;
  readonly message: string;
}

export interface EnquiryPublicResult {
  readonly created: boolean;
  readonly reference: string;
  readonly category: EnquiryCategory;
  readonly subject: string;
  readonly status: EnquiryStatus;
  readonly submittedAt: Date;
  readonly acknowledgement: string;
}

export interface EnquiryListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly category?: EnquiryCategory;
  readonly status?: EnquiryStatus;
}

export interface EnquiryListItem {
  readonly reference: string;
  readonly sender: string;
  readonly email: string;
  readonly category: EnquiryCategory;
  readonly subject: string;
  readonly status: EnquiryStatus;
  readonly submittedAt: Date;
}

export interface EnquiryPage {
  readonly items: readonly EnquiryListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface EnquiryHistoryItem {
  readonly id: string;
  readonly action: "SUBMITTED" | EnquiryDecision;
  readonly fromStatus: EnquiryStatus | null;
  readonly toStatus: EnquiryStatus;
  readonly adminName: string | null;
  readonly internalNote: string | null;
  readonly createdAt: Date;
}

export interface EnquiryAdminDetail extends EnquiryListItem {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string | null;
  readonly organization: string | null;
  readonly country: string | null;
  readonly message: string;
  readonly updatedAt: Date;
  readonly resolvedAt: Date | null;
  readonly closedAt: Date | null;
  readonly history: readonly EnquiryHistoryItem[];
}

export interface EnquiryNotificationClaim {
  readonly id: string;
  readonly recipientKind: "ACKNOWLEDGEMENT" | "INTERNAL";
  readonly email: string;
  readonly name: string;
  readonly reference: string;
  readonly category: EnquiryCategory;
  readonly subject: string;
  readonly sender: string;
  readonly submittedAt: Date;
}
