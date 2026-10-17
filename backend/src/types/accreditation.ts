export const accreditationCategories = [
  "PROFESSIONAL_DELEGATE",
  "STUDENT_DELEGATE",
  "SPONSOR_REPRESENTATIVE",
  "EXHIBITOR_REPRESENTATIVE",
  "SPEAKER",
  "MEDIA_PRESS",
  "PARTNER",
  "VIP_GUEST",
  "COMMITTEE_ORGANIZER",
  "STAFF_VOLUNTEER",
] as const;
export type AccreditationCategory = (typeof accreditationCategories)[number];

export const intakeCategories = [
  "SPONSOR_REPRESENTATIVE",
  "EXHIBITOR_REPRESENTATIVE",
  "SPEAKER",
  "MEDIA_PRESS",
  "PARTNER",
  "VIP_GUEST",
  "COMMITTEE_ORGANIZER",
  "STAFF_VOLUNTEER",
] as const satisfies readonly AccreditationCategory[];
export type IntakeCategory = (typeof intakeCategories)[number];

export const accreditationStatuses = [
  "LINKED",
  "PENDING",
  "APPROVED",
  "REVOKED",
] as const;
export type AccreditationStatus = (typeof accreditationStatuses)[number];
export type AccreditationSourceType =
  | "DELEGATE_REGISTRATION"
  | "SPONSOR_APPLICATION"
  | "EXHIBITOR_APPLICATION"
  | "ADMIN_INTAKE";

export interface ConferenceEvent {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly year: number;
  readonly isActive: boolean;
}

export interface Accreditation {
  readonly id: string;
  readonly eventId: string;
  readonly eventCode: string;
  readonly category: AccreditationCategory;
  readonly fullName: string;
  readonly email: string;
  readonly organizationName: string | null;
  readonly country: string | null;
  readonly status: AccreditationStatus;
  readonly sourceType: AccreditationSourceType;
  readonly sourceId: string | null;
  readonly sourceReference: string | null;
  readonly sourceOrganizationName: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly approvedAt: Date | null;
}

export interface AccreditationPage {
  readonly accreditations: Accreditation[];
  readonly page: number;
  readonly hasMore: boolean;
}
