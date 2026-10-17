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

export interface ReportFilters {
  readonly page: number;
  readonly limit: number;
  readonly dateFrom?: string | undefined;
  readonly dateTo?: string | undefined;
  readonly status?: string | undefined;
  readonly paymentStatus?: string | undefined;
  readonly currency?: "NGN" | "USD" | undefined;
  readonly package?: string | undefined;
  readonly category?: string | undefined;
}

export interface ReportColumn {
  readonly key: string;
  readonly label: string;
}
export type ReportRow = Record<string, string | null>;
export interface ReportPage {
  readonly domain: ReportDomain;
  readonly columns: readonly ReportColumn[];
  readonly items: readonly ReportRow[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ReportSummary {
  readonly professionalRegistrations: number;
  readonly paidProfessionalRegistrations: number;
  readonly pendingProfessionalRegistrations: number;
  readonly studentsByStatus: Record<string, number>;
  readonly confirmedRevenueMinor: {
    readonly NGN: number;
    readonly USD: number;
  };
  readonly sponsorApplications: number;
  readonly confirmedSponsors: number;
  readonly exhibitorApplications: number;
  readonly confirmedExhibitors: number;
  readonly abstractSubmissions: number;
  readonly acceptedAbstracts: number;
  readonly openEnquiries: number;
  readonly generatedAt: Date;
}
