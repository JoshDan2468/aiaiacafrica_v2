import { API_BASE_URL, apiRequest, handleAdminUnauthorized } from "@/services/api/client";
import type { Permission } from "@/types/auth";

export const reportDomains = [
  "delegates",
  "students",
  "payments",
  "sponsors",
  "exhibitors",
  "abstracts",
  "enquiries",
] as const;
export type ReportDomain = (typeof reportDomains)[number];

export interface ReportDefinition {
  domain: ReportDomain;
  label: string;
  group: "Registration" | "Finance" | "Commercial" | "Programme" | "Operations";
  permission: Permission;
  statuses: readonly string[];
  packages?: readonly string[];
  currencies?: readonly string[];
  categories?: readonly string[];
  paymentStatuses?: readonly string[];
}

const commercialStatuses = ["SUBMITTED", "MORE_INFORMATION_REQUIRED", "CONFIRMED", "DECLINED"];
export const reportDefinitions: readonly ReportDefinition[] = [
  {
    domain: "delegates",
    label: "Professional Delegates",
    group: "Registration",
    permission: "delegates.read",
    statuses: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
    paymentStatuses: ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"],
  },
  {
    domain: "students",
    label: "Student Delegates",
    group: "Registration",
    permission: "student_verifications.read",
    statuses: ["NOT_SUBMITTED", "PENDING", "MORE_INFORMATION_REQUIRED", "APPROVED", "REJECTED"],
  },
  {
    domain: "payments",
    label: "Payments",
    group: "Finance",
    permission: "payments.read",
    statuses: ["INITIALIZED", "PENDING", "PAID", "FAILED", "ABANDONED", "REVERSED"],
    currencies: ["NGN", "USD"],
    packages: ["PROFESSIONAL", "STUDENT"],
  },
  {
    domain: "sponsors",
    label: "Sponsors",
    group: "Commercial",
    permission: "sponsors.read",
    statuses: commercialStatuses,
    packages: ["TITLE", "STRATEGIC", "DIAMOND", "PLATINUM", "GOLD", "SILVER"],
  },
  {
    domain: "exhibitors",
    label: "Exhibitors",
    group: "Commercial",
    permission: "exhibitors.read",
    statuses: commercialStatuses,
    packages: ["9_SQM", "18_SQM", "36_SQM"],
  },
  {
    domain: "abstracts",
    label: "Abstracts",
    group: "Programme",
    permission: "abstracts.read",
    statuses: ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "ACCEPTED", "REJECTED"],
  },
  {
    domain: "enquiries",
    label: "Enquiries",
    group: "Operations",
    permission: "enquiries.read",
    statuses: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
    categories: [
      "GENERAL",
      "REGISTRATION",
      "SPONSORSHIP",
      "EXHIBITION",
      "MEDIA",
      "SPEAKER_ABSTRACT",
      "PARTNERSHIP",
      "OTHER",
    ],
  },
];

export interface ReportFilters {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentStatus?: string;
  currency?: string;
  package?: string;
  category?: string;
}
export interface ReportColumn {
  key: string;
  label: string;
}
export interface ReportPage {
  domain: ReportDomain;
  columns: ReportColumn[];
  items: Record<string, string | null>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface ReportSummary {
  professionalRegistrations: number;
  paidProfessionalRegistrations: number;
  pendingProfessionalRegistrations: number;
  studentsByStatus: Record<string, number>;
  confirmedRevenueMinor: { NGN: number; USD: number };
  sponsorApplications: number;
  confirmedSponsors: number;
  exhibitorApplications: number;
  confirmedExhibitors: number;
  abstractSubmissions: number;
  acceptedAbstracts: number;
  openEnquiries: number;
  generatedAt: string;
}
interface Envelope<T> {
  success: true;
  data: T;
}

export function reportQuery(filters: ReportFilters): URLSearchParams {
  const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
  for (const key of [
    "dateFrom",
    "dateTo",
    "status",
    "paymentStatus",
    "currency",
    "package",
    "category",
  ] as const) {
    const value = filters[key];
    if (value) query.set(key, value);
  }
  return query;
}

export async function getReport(domain: ReportDomain, filters: ReportFilters) {
  const result = await apiRequest<Envelope<{ report: ReportPage }>>(
    `/admin/reports/${domain}?${reportQuery(filters)}`,
  );
  return result.ok && result.data?.success && result.data.data?.report
    ? { ok: true as const, report: result.data.data.report }
    : { ok: false as const, error: result.error ?? "The report could not be loaded." };
}

export async function getReportSummary() {
  const result = await apiRequest<Envelope<{ summary: ReportSummary }>>("/admin/reports/summary");
  return result.ok && result.data?.success && result.data.data?.summary
    ? { ok: true as const, summary: result.data.data.summary }
    : { ok: false as const, error: result.error ?? "The summary could not be loaded." };
}

export async function downloadReportCsv(domain: ReportDomain, filters: ReportFilters) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/reports/${domain}/export?${reportQuery(filters)}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "X-AIAIAC-CSRF": "1", Accept: "text/csv" },
      },
    );
    if (!response.ok) {
      handleAdminUnauthorized(`/admin/reports/${domain}/export`, response.status);
      return {
        ok: false as const,
        error:
          response.status === 413
            ? "The export is too large. Narrow the date or status filters."
            : "The export could not be generated.",
      };
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aiaiac-2027-${domain}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "The export service could not be reached." };
  }
}
