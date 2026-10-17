import { apiRequest } from "@/services/api/client";
import type {
  CommercialApplicationKind,
  CommercialApplicationStatus,
} from "./commercialApplicationTypes";
export type { CommercialApplicationKind } from "./commercialApplicationTypes";

export interface CommercialApplicationListItem {
  reference: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  packageCode: string;
  packageName: string;
  currency: "USD";
  priceMinor: number;
  status: CommercialApplicationStatus;
  submittedAt: string;
}

export interface CommercialApplicationHistoryItem {
  id: string;
  action: CommercialApplicationStatus;
  fromStatus: CommercialApplicationStatus | null;
  toStatus: CommercialApplicationStatus;
  reviewerName: string | null;
  applicantReason: string | null;
  internalNote: string | null;
  createdAt: string;
}

export interface CommercialApplicationDetail extends CommercialApplicationListItem {
  origin?: "PUBLIC" | "MANUAL_IMPORT";
  importSource?: string | null;
  approvalEvidence?: string | null;
  kind: CommercialApplicationKind;
  country: string;
  website: string | null;
  industry: string | null;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactJobTitle: string | null;
  applicantNotes: string | null;
  currentApplicantReason: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  history: CommercialApplicationHistoryItem[];
}

interface Envelope<T> {
  success: true;
  data: T;
}

export async function listCommercialApplications(
  kind: CommercialApplicationKind,
  query: URLSearchParams,
) {
  const segment = kind === "SPONSOR" ? "sponsor" : "exhibitor";
  const result = await apiRequest<
    Envelope<{
      applications: {
        items: CommercialApplicationListItem[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>
  >(`/admin/${segment}-applications?${query.toString()}`);
  return result.ok && result.data?.data.applications
    ? { ok: true as const, applications: result.data.data.applications }
    : { ok: false as const, error: result.error ?? "Applications could not be loaded." };
}

export async function getCommercialApplication(kind: CommercialApplicationKind, reference: string) {
  const segment = kind === "SPONSOR" ? "sponsor" : "exhibitor";
  const result = await apiRequest<Envelope<{ application: CommercialApplicationDetail }>>(
    `/admin/${segment}-applications/${encodeURIComponent(reference)}`,
  );
  return result.ok && result.data?.data.application
    ? { ok: true as const, application: result.data.data.application }
    : { ok: false as const, error: result.error ?? "Application could not be loaded." };
}

export async function decideCommercialApplication(
  kind: CommercialApplicationKind,
  reference: string,
  action: "confirm" | "request-more-information" | "decline",
  body: { note?: string; reason?: string },
) {
  const segment = kind === "SPONSOR" ? "sponsor" : "exhibitor";
  const result = await apiRequest<Envelope<{ application: unknown }>>(
    `/admin/${segment}-applications/${encodeURIComponent(reference)}/${action}`,
    { method: "POST", body },
  );
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, error: result.error ?? "The decision could not be saved." };
}

export async function retryCommercialNotification(
  kind: CommercialApplicationKind,
  reference: string,
) {
  const segment = kind === "SPONSOR" ? "sponsor" : "exhibitor";
  const result = await apiRequest<Envelope<{ attempted: number }>>(
    `/admin/${segment}-applications/${encodeURIComponent(reference)}/notifications/retry`,
    { method: "POST", body: {} },
  );
  return result.ok && result.data
    ? { ok: true as const, attempted: result.data.data.attempted }
    : { ok: false as const, error: result.error ?? "Notification retry failed." };
}

export interface CommercialImportSummary {
  valid: number;
  imported: number;
  skipped: number;
  invalid: number;
  errors: { row: number; reason: string }[];
  rows: { row: number; organizationName: string; contactEmail: string; packageCode: string }[];
}
export function importApprovedCommercialApplications(
  kind: CommercialApplicationKind,
  input: { csv: string; source: string; approvalEvidence: string; acknowledged?: true },
  commit: boolean,
) {
  return apiRequest<{ success: true; data: { summary: CommercialImportSummary } }>(
    `/admin/${kind === "SPONSOR" ? "sponsor" : "exhibitor"}-applications/${commit ? "import-approved" : "import-preview"}`,
    { method: "POST", body: input },
  );
}
