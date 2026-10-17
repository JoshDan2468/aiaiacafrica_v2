export const abstractStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISION_REQUIRED",
  "ACCEPTED",
  "REJECTED",
] as const;
export type AbstractStatus = (typeof abstractStatuses)[number];

export const abstractTopics = [
  "Asset Integrity & Reliability",
  "Corrosion & Materials",
  "Digital Integrity & AI",
  "Automation & Control",
  "OT/ICS Cybersecurity",
  "Threat, Risk & Resilience",
] as const;
export type AbstractTopic = (typeof abstractTopics)[number];

export interface AbstractContent {
  readonly title: string;
  readonly abstractBody: string;
  readonly keywords?: string | undefined;
  readonly topic?: AbstractTopic | undefined;
}

export interface AbstractSubmissionInput extends AbstractContent {
  readonly idempotencyKey: string;
  readonly authorFirstName: string;
  readonly authorLastName: string;
  readonly authorEmail: string;
  readonly authorPhone: string;
  readonly organizationName: string;
  readonly jobTitle?: string | undefined;
  readonly country: string;
  readonly consent: true;
}

export interface AbstractPublicConfirmation {
  readonly created: boolean;
  readonly reference: string;
  readonly title: string;
  readonly wordCount: number;
  readonly status: AbstractStatus;
  readonly submittedAt: Date;
  readonly continuationToken: string;
  readonly continuationTokenExpiresAt: Date;
  readonly nextStep: string;
}

export interface AbstractPublicWorkspace {
  readonly reference: string;
  readonly title: string;
  readonly abstractBody: string;
  readonly wordCount: number;
  readonly keywords: string | null;
  readonly topic: AbstractTopic | null;
  readonly status: AbstractStatus;
  readonly submittedAt: Date;
  readonly resubmittedAt: Date | null;
  readonly currentReviewReason: string | null;
  readonly editingAllowed: boolean;
  readonly resubmissionAllowed: boolean;
  readonly paymentAvailable: false;
}

export interface AbstractHistoryItem {
  readonly id: string;
  readonly action:
    | "SUBMITTED"
    | "REVIEW_STARTED"
    | "REVISION_REQUIRED"
    | "RESUBMITTED"
    | "ACCEPTED"
    | "REJECTED";
  readonly fromStatus: AbstractStatus | null;
  readonly toStatus: AbstractStatus;
  readonly reviewerName: string | null;
  readonly authorVisibleReason: string | null;
  readonly internalNote: string | null;
  readonly wordCount: number;
  readonly createdAt: Date;
}

export interface AbstractAdminListItem {
  readonly reference: string;
  readonly authorName: string;
  readonly organizationName: string;
  readonly country: string;
  readonly title: string;
  readonly wordCount: number;
  readonly status: AbstractStatus;
  readonly submittedAt: Date;
  readonly resubmittedAt: Date | null;
}

export interface AbstractAdminDetail extends AbstractAdminListItem {
  readonly authorEmail: string;
  readonly authorPhone: string;
  readonly jobTitle: string | null;
  readonly abstractBody: string;
  readonly keywords: string | null;
  readonly topic: AbstractTopic | null;
  readonly currentReviewReason: string | null;
  readonly reviewerName: string | null;
  readonly reviewStartedAt: Date | null;
  readonly decidedAt: Date | null;
  readonly history: readonly AbstractHistoryItem[];
}

export interface AbstractListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string | undefined;
  readonly status?: AbstractStatus | undefined;
}

export interface AbstractPage {
  readonly items: readonly AbstractAdminListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface AbstractNotificationClaim {
  readonly id: string;
  readonly notificationType:
    "SUBMITTED" | "REVISION_REQUIRED" | "RESUBMITTED" | "ACCEPTED" | "REJECTED";
  readonly email: string;
  readonly fullName: string;
  readonly reference: string;
  readonly title: string;
  readonly authorVisibleReason: string | null;
}
