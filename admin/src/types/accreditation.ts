export type AccreditationCategory =
  | "PROFESSIONAL_DELEGATE"
  | "STUDENT_DELEGATE"
  | "SPONSOR_REPRESENTATIVE"
  | "EXHIBITOR_REPRESENTATIVE"
  | "SPEAKER"
  | "MEDIA_PRESS"
  | "PARTNER"
  | "VIP_GUEST"
  | "COMMITTEE_ORGANIZER"
  | "STAFF_VOLUNTEER";

export type IntakeAccreditationCategory = Exclude<
  AccreditationCategory,
  "PROFESSIONAL_DELEGATE" | "STUDENT_DELEGATE"
>;

export type AccreditationStatus = "LINKED" | "PENDING" | "APPROVED" | "REVOKED";

export interface AccreditationEvent {
  id: string;
  code: string;
  name: string;
  year: number;
  isActive: boolean;
}

export interface Accreditation {
  id: string;
  eventId: string;
  eventCode: string;
  category: AccreditationCategory;
  fullName: string;
  email: string;
  organizationName: string | null;
  country: string | null;
  status: AccreditationStatus;
  sourceType:
    "DELEGATE_REGISTRATION" | "SPONSOR_APPLICATION" | "EXHIBITOR_APPLICATION" | "ADMIN_INTAKE";
  sourceId: string | null;
  sourceReference: string | null;
  sourceOrganizationName: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

export interface CreateAccreditationInput {
  eventId: string;
  category: IntakeAccreditationCategory;
  fullName: string;
  email: string;
  organizationName?: string;
  country?: string;
  sourceApplicationReference?: string;
}

export const accreditationCategories: AccreditationCategory[] = [
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
];

export const intakeAccreditationCategories: IntakeAccreditationCategory[] = [
  "SPONSOR_REPRESENTATIVE",
  "EXHIBITOR_REPRESENTATIVE",
  "SPEAKER",
  "MEDIA_PRESS",
  "PARTNER",
  "VIP_GUEST",
  "COMMITTEE_ORGANIZER",
  "STAFF_VOLUNTEER",
];

export function formatAccreditationCategory(category: AccreditationCategory): string {
  if (category === "MEDIA_PRESS") return "Media / Press";
  if (category === "VIP_GUEST") return "VIP / Guest";
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function isRepresentativeCategory(category: AccreditationCategory): boolean {
  return category === "SPONSOR_REPRESENTATIVE" || category === "EXHIBITOR_REPRESENTATIVE";
}

export function isDelegateCategory(category: AccreditationCategory): boolean {
  return category === "PROFESSIONAL_DELEGATE" || category === "STUDENT_DELEGATE";
}
