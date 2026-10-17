export interface AdminOverviewMetrics {
  readonly totalRegistrations: number;
  readonly paidRegistrations: number;
  readonly pendingPayments: number;
  readonly confirmedRevenue: {
    readonly NGN: number;
    readonly USD: number;
  };
  readonly sponsorApplications: number;
  readonly confirmedSponsors: number;
  readonly exhibitorApplications: number;
  readonly confirmedExhibitors: number;
  readonly abstractSubmissions: number;
  readonly abstractPendingReview: number;
  readonly acceptedAbstracts: number;
  readonly openEnquiries: number;
}

export interface AdminRecentActivity {
  readonly type: string;
  readonly summary: string;
  readonly occurredAt: Date;
}

export interface AdminOverview {
  readonly metrics: AdminOverviewMetrics;
  readonly recentActivity: AdminRecentActivity[];
}
