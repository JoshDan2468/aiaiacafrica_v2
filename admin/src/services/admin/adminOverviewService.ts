import { apiRequest } from "@/services/api/client";

export interface AdminOverviewMetrics {
  totalRegistrations: number;
  paidRegistrations: number;
  pendingPayments: number;
  confirmedRevenue: { NGN: number; USD: number };
  sponsorApplications: number;
  confirmedSponsors: number;
  exhibitorApplications: number;
  confirmedExhibitors: number;
  abstractSubmissions: number;
  abstractPendingReview: number;
  acceptedAbstracts: number;
  openEnquiries: number;
}

export interface AdminRecentActivity {
  type: string;
  summary: string;
  occurredAt: string;
}

export interface AdminOverview {
  metrics: AdminOverviewMetrics;
  recentActivity: AdminRecentActivity[];
}

interface Envelope<T> {
  success: true;
  data: T;
}

function isAdminOverviewEnvelope(
  value: Envelope<{ overview: AdminOverview }> | undefined,
): value is Envelope<{ overview: AdminOverview }> {
  const overview = value?.data?.overview;
  return Boolean(
    value?.success === true &&
    overview &&
    typeof overview.metrics?.totalRegistrations === "number" &&
    typeof overview.metrics?.paidRegistrations === "number" &&
    typeof overview.metrics?.pendingPayments === "number" &&
    typeof overview.metrics?.confirmedRevenue?.NGN === "number" &&
    typeof overview.metrics?.confirmedRevenue?.USD === "number" &&
    typeof overview.metrics?.sponsorApplications === "number" &&
    typeof overview.metrics?.confirmedSponsors === "number" &&
    typeof overview.metrics?.exhibitorApplications === "number" &&
    typeof overview.metrics?.confirmedExhibitors === "number" &&
    typeof overview.metrics?.abstractSubmissions === "number" &&
    typeof overview.metrics?.abstractPendingReview === "number" &&
    typeof overview.metrics?.acceptedAbstracts === "number" &&
    typeof overview.metrics?.openEnquiries === "number" &&
    Array.isArray(overview.recentActivity),
  );
}

export async function getAdminOverview() {
  const result = await apiRequest<Envelope<{ overview: AdminOverview }>>("/admin/overview");
  return result.ok && isAdminOverviewEnvelope(result.data)
    ? { ok: true as const, overview: result.data.data.overview }
    : {
        ok: false as const,
        status: result.status,
        error: result.error ?? "The overview response was invalid.",
      };
}
