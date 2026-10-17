import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecentActivitySection } from "@/pages/admin/dashboard/RecentActivitySection";
import { SummarySection } from "@/pages/admin/dashboard/SummarySection";
import { getAdminOverview, type AdminOverview } from "@/services/admin/adminOverviewService";

const overview: AdminOverview = {
  metrics: {
    totalRegistrations: 7,
    paidRegistrations: 3,
    pendingPayments: 2,
    confirmedRevenue: { NGN: 420000000, USD: 150000 },
    sponsorApplications: 0,
    confirmedSponsors: 0,
    exhibitorApplications: 0,
    confirmedExhibitors: 0,
    abstractSubmissions: 0,
    abstractPendingReview: 0,
    acceptedAbstracts: 0,
    openEnquiries: 4,
  },
  recentActivity: [
    {
      type: "PAYMENT_CONFIRMED",
      summary: "Payment confirmed for AIAIAC-DEL-SAFE1234",
      occurredAt: "2026-09-20T10:00:00.000Z",
    },
  ],
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Admin overview", () => {
  it("renders live registration totals and separate currency revenue", () => {
    render(<SummarySection overview={overview} state="ready" onRetry={vi.fn()} />);
    expect(screen.getByText("7")).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(screen.getByText(/₦4,200,000/)).toBeVisible();
    expect(screen.getByText(/\$1,500/)).toBeVisible();
  });

  it("shows unavailable values and a retry action after a request failure", async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(<SummarySection overview={null} state="error" onRetry={onRetry} />);
    expect(
      screen.getByText("Live overview metrics are temporarily unavailable."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(13);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders authoritative recent activity", () => {
    render(<RecentActivitySection items={overview.recentActivity} />);
    expect(screen.getByText("Payment confirmed for AIAIAC-DEL-SAFE1234")).toBeVisible();
    expect(screen.getByRole("time")).toHaveAttribute("datetime", "2026-09-20T10:00:00.000Z");
  });

  it("requests the protected overview endpoint and validates its envelope", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { overview } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getAdminOverview();
    expect(result).toEqual({ ok: true, overview });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/overview",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("rejects a successful but malformed overview response safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true })));
    const result = await getAdminOverview();
    expect(result.ok).toBe(false);
  });
});
