import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAdminOverview, type AdminOverview } from "@/services/admin/adminOverviewService";
import { ActionQueueSection } from "./ActionQueueSection";
import { OverviewSection } from "./OverviewSection";
import { RecentActivitySection } from "./RecentActivitySection";
import { SummarySection } from "./SummarySection";

export function AdminDashboardPage() {
  const { admin } = useAuth();
  const firstName = admin?.fullName.trim().split(/\s+/)[0] || "Administrator";
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const loadOverview = useCallback(async () => {
    setState("loading");
    const result = await getAdminOverview();
    if (!result.ok) {
      setState("error");
      return;
    }
    setOverview(result.overview);
    setState("ready");
  }, []);

  useEffect(() => void loadOverview(), [loadOverview]);

  return (
    <div className="space-y-6">
      <OverviewSection firstName={firstName} />
      <SummarySection overview={overview} state={state} onRetry={loadOverview} />
      {state === "ready" && overview ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentActivitySection items={overview.recentActivity} />
          <ActionQueueSection overview={overview} />
        </div>
      ) : null}
    </div>
  );
}
