import { apiRequest } from "@/services/api/client";

export type CampaignPurpose =
  | "ESSENTIAL_EVENT_UPDATE"
  | "MARKETING"
  | "PAYMENT_REMINDER"
  | "EVENT_ANNOUNCEMENT"
  | "DELEGATE_UPDATE"
  | "SPONSOR_OUTREACH"
  | "EXHIBITOR_OUTREACH";

export const requiresCampaignConsent = (purpose?: CampaignPurpose) =>
  !["PAYMENT_REMINDER", "ESSENTIAL_EVENT_UPDATE"].includes(purpose ?? "MARKETING");

export const isEventParticipantAudience = (code: string) =>
  [
    "ALL_CONTACTS",
    "ALL_DELEGATES",
    "PROFESSIONAL_DELEGATES",
    "STUDENT_DELEGATES",
    "SPONSORS",
    "CONFIRMED_SPONSORS",
    "EXHIBITORS",
    "CONFIRMED_EXHIBITORS",
    "ABSTRACT_AUTHORS",
  ].includes(code);

export type AudienceCode =
  | "PROSPECTIVE_DELEGATES"
  | "PROSPECTIVE_SPONSORS"
  | "PROSPECTIVE_EXHIBITORS"
  | "ALL_DELEGATE_CONTACTS"
  | "ALL_SPONSOR_CONTACTS"
  | "ALL_EXHIBITOR_CONTACTS"
  | "ALL_CONTACTS"
  | "ALL_DELEGATES"
  | "PROFESSIONAL_DELEGATES"
  | "STUDENT_DELEGATES"
  | "SPONSORS"
  | "CONFIRMED_SPONSORS"
  | "EXHIBITORS"
  | "CONFIRMED_EXHIBITORS"
  | "ABSTRACT_AUTHORS"
  | "APPROVED_CONTACTS";
export interface Audience {
  code: AudienceCode;
  purpose?: CampaignPurpose;
  registrationStatus?: string;
  paymentStatus?: string;
  verificationStatus?: string;
  country?: string;
  currency?: "NGN" | "USD" | undefined;
  abstractStatus?: string;
}
export interface CampaignContent {
  purpose?: CampaignPurpose;
  title: string;
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  audience: Audience;
}
export interface Campaign extends CampaignContent {
  id: string;
  reference: string;
  status: "DRAFT" | "SCHEDULED" | "CANCELLED" | "SENDING" | "SENT" | "PARTIALLY_FAILED" | "FAILED";
  recipientCount: number;
  revision?: number;
  scheduledAt?: string | null;
  confirmedBy?: string | null;
  skipped?: number;
  uncertain?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  sent: number;
  failed: number;
  pending: number;
  claimed: number;
}
export interface Delivery {
  id: string;
  campaignReference: string;
  email: string;
  name: string;
  sourceCategory: string;
  status: string;
  attempts: number;
  providerStatus?: string | null;
  providerMessageId: string | null;
  errorSummary: string | null;
  sentAt: string | null;
}
export interface Preset {
  id: string;
  label: string;
  heading: string;
  body: string;
}
interface Envelope<T> {
  success: true;
  data: T;
}
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  if (body && typeof body === "object") {
    const value = body as Record<string, unknown>;
    const audience = (value["audience"] ?? value) as Record<string, unknown>;
    if (
      value["purpose"] === "PAYMENT_REMINDER" &&
      (!["ALL_DELEGATES", "PROFESSIONAL_DELEGATES", "STUDENT_DELEGATES"].includes(
        String(audience["code"]),
      ) ||
        !["UNPAID", "ABANDONED"].includes(String(audience["paymentStatus"])))
    ) {
      throw new Error(
        "Payment reminders require a delegate audience with payment status UNPAID or ABANDONED.",
      );
    }
    if (
      path === "/preview" ||
      (path.startsWith("/campaigns") && ["POST", "PUT"].includes(method) && "title" in value)
    ) {
      for (const [key, label, minimum] of [
        ["title", "Internal campaign name", 3],
        ["subject", "Email subject", 3],
        ["preheader", "Preheader", 3],
        ["heading", "Email heading", 3],
        ["body", "Message", 10],
      ] as const) {
        if (String(value[key] ?? "").trim().length < minimum) {
          throw new Error(`${label} is required (at least ${minimum} characters).`);
        }
      }
    }
  }
  const response = await apiRequest<Envelope<T>>(`/admin/communications${path}`, { method, body });
  if (!response.ok || !response.data)
    throw new Error(response.error ?? "Communication request failed");
  return response.data.data;
}
export const communicationService = {
  settings: () =>
    request<{
      bulkSendEnabled: boolean;
      providerConfigured: boolean;
      marketingConfigured: boolean;
      supportedAudiences?: AudienceCode[];
      supportedPurposes?: CampaignPurpose[];
      campaignLimit: number;
      perMinuteLimit: number;
    }>("/settings"),
  preferences: (page = 1, suppressed = false) =>
    request<{ items: Preference[]; total: number }>(
      `/preferences?page=${page}&suppressed=${suppressed}`,
    ),
  setPreference: (input: PreferenceInput) =>
    request<{ updated: boolean }>("/preferences", "PUT", input),
  cancel: (reference: string) => request<Campaign>(`/campaigns/${reference}/cancel`, "POST"),
  presets: () => request<Preset[]>("/templates"),
  count: (audience: Audience) =>
    request<{
      recipients?: { email: string; name: string; sourceCategory: string }[];
      count: number;
      totalContacts?: number;
      excludedSuppressed?: number;
      excludedOptedOut?: number;
      excludedNoConsent?: number;
      fingerprint: string;
      overLimit: boolean;
      limit: number;
    }>("/audience/count", "POST", audience),
  preview: (content: CampaignContent) =>
    request<{ subject: string; text: string; html: string }>("/preview", "POST", {
      ...content,
      title: content.title.trim() || content.subject,
      preheader: content.preheader.trim() || content.subject,
    }),
  create: (content: CampaignContent) => request<Campaign>("/campaigns", "POST", content),
  update: (reference: string, content: CampaignContent) =>
    request<Campaign>(`/campaigns/${reference}`, "PUT", content),
  get: (reference: string) => request<Campaign>(`/campaigns/${reference}`),
  list: (page = 1, status = "") =>
    request<{ items: Campaign[]; total: number }>(
      `/campaigns?page=${page}${status ? `&status=${status}` : ""}`,
    ),
  deliveries: (page = 1, status = "", campaign = "") =>
    request<{ items: Delivery[]; total: number }>(
      `/deliveries?page=${page}${status ? `&status=${status}` : ""}${campaign ? `&campaign=${campaign}` : ""}`,
    ),
  test: (reference: string, email: string) =>
    request<{ accepted: boolean; providerMessageId: string | null }>(
      `/campaigns/${reference}/test`,
      "POST",
      { email },
    ),
  confirm: (reference: string, fingerprint: string, revision: number, scheduledAt?: string) =>
    request<Campaign>(`/campaigns/${reference}/confirm`, "POST", {
      fingerprint,
      revision,
      acknowledged: true,
      ...(scheduledAt ? { scheduledAt } : {}),
    }),
  deliver: (reference: string) =>
    request<{ processed: number; campaign: Campaign }>(`/campaigns/${reference}/deliver`, "POST"),
  retry: (reference: string) =>
    request<{ processed: number; campaign: Campaign }>(`/campaigns/${reference}/retry`, "POST"),
};

export interface PreferenceInput {
  email: string;
  consent?: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  evidence?: string;
  sourceLabel?: string;
  suppressed?: boolean;
  reason?: string;
}
export interface Preference extends PreferenceInput {
  id: string;
  consent: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  suppressed: boolean;
  updatedAt: string;
}
