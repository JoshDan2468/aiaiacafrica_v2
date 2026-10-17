export const communicationAudiences = [
  "ALL_CONTACTS",
  "ALL_DELEGATE_CONTACTS",
  "ALL_SPONSOR_CONTACTS",
  "ALL_EXHIBITOR_CONTACTS",
  "PROSPECTIVE_DELEGATES",
  "PROSPECTIVE_SPONSORS",
  "PROSPECTIVE_EXHIBITORS",
  "ALL_DELEGATES",
  "PROFESSIONAL_DELEGATES",
  "STUDENT_DELEGATES",
  "SPONSORS",
  "CONFIRMED_SPONSORS",
  "EXHIBITORS",
  "CONFIRMED_EXHIBITORS",
  "ABSTRACT_AUTHORS",
  "APPROVED_CONTACTS",
] as const;
export type CommunicationAudienceCode = (typeof communicationAudiences)[number];

export const communicationPurposes = [
  "MARKETING",
  "EVENT_ANNOUNCEMENT",
  "ESSENTIAL_EVENT_UPDATE",
  "DELEGATE_UPDATE",
  "SPONSOR_OUTREACH",
  "EXHIBITOR_OUTREACH",
  "PAYMENT_REMINDER",
] as const;
export type CommunicationPurpose = (typeof communicationPurposes)[number];
export function requiresCampaignConsent(purpose?: string): boolean {
  return !["PAYMENT_REMINDER", "ESSENTIAL_EVENT_UPDATE"].includes(
    purpose ?? "MARKETING",
  );
}

export function isRegisteredDelegateAudience(code: string): boolean {
  return [
    "ALL_DELEGATES",
    "PROFESSIONAL_DELEGATES",
    "STUDENT_DELEGATES",
  ].includes(code);
}

export function isEventParticipantAudience(code: string): boolean {
  return (
    isRegisteredDelegateAudience(code) ||
    [
      "ALL_CONTACTS",
      "SPONSORS",
      "CONFIRMED_SPONSORS",
      "EXHIBITORS",
      "CONFIRMED_EXHIBITORS",
      "ABSTRACT_AUTHORS",
    ].includes(code)
  );
}

export interface CommunicationAudience {
  code: CommunicationAudienceCode;
  purpose?: CommunicationPurpose | undefined;
  registrationStatus?: string | undefined;
  paymentStatus?: string | undefined;
  verificationStatus?: string | undefined;
  country?: string | undefined;
  currency?: "NGN" | "USD" | undefined;
  abstractStatus?: string | undefined;
}

export interface CommunicationContent {
  purpose?: CommunicationPurpose | undefined;
  title: string;
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaLabel?: string | null | undefined;
  ctaUrl?: string | null | undefined;
  audience: CommunicationAudience;
}

export interface CommunicationRecipient {
  email: string;
  name: string;
  sourceCategory: string;
}

export interface CommunicationCampaign extends CommunicationContent {
  id: string;
  reference: string;
  status:
    | "DRAFT"
    | "SCHEDULED"
    | "CANCELLED"
    | "SENDING"
    | "SENT"
    | "PARTIALLY_FAILED"
    | "FAILED";
  recipientCount: number;
  revision?: number;
  scheduledAt?: Date | null;
  confirmedBy?: string | null;
  skipped?: number;
  uncertain?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  sent: number;
  failed: number;
  pending: number;
  claimed: number;
}

export interface CommunicationDelivery extends CommunicationRecipient {
  id: string;
  campaignId: string;
  status: "PENDING" | "CLAIMED" | "SENT" | "FAILED" | "SKIPPED" | "UNCERTAIN";
  attempts: number;
  providerStatus?: string | null;
  providerMessageId: string | null;
  errorSummary: string | null;
  sentAt: Date | null;
}
