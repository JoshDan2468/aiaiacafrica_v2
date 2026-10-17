import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  FileCheck2,
  Inbox,
  Store,
  UsersRound,
  WalletCards,
  type TablerIcon,
} from "@/components/admin/adminIcons";
import { AdminMetricCard, type MetricTone } from "@/components/admin/AdminMetricCard";
import type { AdminOverview } from "@/services/admin/adminOverviewService";

interface DashboardMetric {
  label: string;
  icon: TablerIcon;
  emoji?: string | undefined;
  subtext: string;
  value: string | number;
  tone?: MetricTone;
  href?: string | undefined;
}

function formatRevenue(amountMinor: number, currency: "NGN" | "USD") {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function SummarySection({
  overview,
  state,
  onRetry,
}: {
  overview: AdminOverview | null;
  state: "loading" | "ready" | "error";
  onRetry: () => Promise<void>;
}) {
  const metrics = overview?.metrics;
  const unavailableValue = state === "loading" ? "…" : "—";

  const registrationMetrics: DashboardMetric[] = [
    {
      label: "Total Registrations",
      icon: UsersRound,
      emoji: "👥",
      subtext: "↑ Live delegate registrations",
      value: metrics?.totalRegistrations ?? unavailableValue,
      tone: "indigo",
      href: "/admin/delegates",
    },
    {
      label: "Paid Registrations",
      icon: BadgeCheck,
      emoji: "✅",
      subtext: "✓ Confirmed payments",
      value: metrics?.paidRegistrations ?? unavailableValue,
      tone: "emerald",
      href: "/admin/delegates?paymentStatus=PAID",
    },
    {
      label: "Pending Payments",
      icon: CircleDollarSign,
      emoji: "💳",
      subtext:
        metrics && metrics.pendingPayments === 0
          ? "✓ All clear"
          : "Registrations awaiting payment",
      value: metrics?.pendingPayments ?? unavailableValue,
      tone: "amber",
      href: "/admin/payments?status=PENDING",
    },
    {
      label: "Confirmed NGN Revenue",
      icon: WalletCards,
      emoji: "💰",
      subtext: "Paid NGN transactions only",
      value: metrics ? formatRevenue(metrics.confirmedRevenue.NGN, "NGN") : unavailableValue,
      tone: "cyan",
      href: "/admin/payments?currency=NGN&status=PAID",
    },
    {
      label: "Confirmed USD Revenue",
      icon: WalletCards,
      emoji: "💵",
      subtext: "Paid USD transactions only",
      value: metrics ? formatRevenue(metrics.confirmedRevenue.USD, "USD") : unavailableValue,
      tone: "purple",
      href: "/admin/payments?currency=USD&status=PAID",
    },
  ];

  const commercialMetrics: DashboardMetric[] = [
    {
      label: "Sponsor Applications",
      icon: Building2,
      emoji: "🏢",
      subtext: "Submitted commercial applications",
      value: metrics?.sponsorApplications ?? unavailableValue,
      tone: "indigo",
      href: "/admin/sponsor-applications",
    },
    {
      label: "Confirmed Sponsors",
      icon: BadgeCheck,
      emoji: "🤝",
      subtext: "✓ Commercial agreements approved",
      value: metrics?.confirmedSponsors ?? unavailableValue,
      tone: "emerald",
      href: "/admin/sponsor-applications?status=CONFIRMED",
    },
    {
      label: "Exhibitor Applications",
      icon: Store,
      emoji: "🏬",
      subtext: "Submitted booth applications",
      value: metrics?.exhibitorApplications ?? unavailableValue,
      tone: "cyan",
      href: "/admin/exhibitor-applications",
    },
    {
      label: "Confirmed Exhibitors",
      icon: BadgeCheck,
      emoji: "🎪",
      subtext: "✓ Booth spaces confirmed",
      value: metrics?.confirmedExhibitors ?? unavailableValue,
      tone: "emerald",
      href: "/admin/exhibitor-applications?status=CONFIRMED",
    },
  ];

  const programmeAndOperationsMetrics: DashboardMetric[] = [
    {
      label: "Abstract Submissions",
      icon: FileCheck2,
      emoji: "📋",
      subtext: "Technical papers submitted",
      value: metrics?.abstractSubmissions ?? unavailableValue,
      tone: "purple",
      href: "/admin/abstract-submissions",
    },
    {
      label: "Abstracts Pending Review",
      icon: FileCheck2,
      emoji: "⏳",
      subtext:
        metrics && metrics.abstractPendingReview === 0
          ? "✓ All reviews complete"
          : "Awaiting committee review",
      value: metrics?.abstractPendingReview ?? unavailableValue,
      tone: "amber",
      href: "/admin/abstract-submissions?status=SUBMITTED",
    },
    {
      label: "Accepted Abstracts",
      icon: BadgeCheck,
      emoji: "📑",
      subtext: "✓ Technical contributions accepted",
      value: metrics?.acceptedAbstracts ?? unavailableValue,
      tone: "emerald",
      href: "/admin/abstract-submissions?status=ACCEPTED",
    },
    {
      label: "Open Enquiries",
      icon: Inbox,
      emoji: "💬",
      subtext:
        metrics && metrics.openEnquiries === 0
          ? "✓ All clear"
          : "Awaiting team response",
      value: metrics?.openEnquiries ?? unavailableValue,
      tone: "indigo",
      href: "/admin/enquiries?status=OPEN",
    },
  ];

  return (
    <section className="space-y-5 sm:space-y-6" aria-labelledby="summary-heading">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-slate-500 sm:text-[13px] dark:text-slate-400">Live event metrics</p>
          <h2 id="summary-heading" className="mt-1 font-sans text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
            Operational summary
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
          Updated live
        </span>
      </div>

      {state === "error" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
            Live overview metrics are temporarily unavailable.
          </p>
          <button
            className="text-xs font-semibold text-[#05190F] hover:underline dark:text-[#CFEA3B]"
            type="button"
            onClick={() => void onRetry()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Primary Registration & Financial Metrics */}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold text-slate-700 sm:mb-3 dark:text-slate-300">Registration &amp; finance</h3>
        <div className="grid auto-rows-fr grid-cols-2 max-[339px]:grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3 xl:grid-cols-5">
          {registrationMetrics.map((metric) => (
            <AdminMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              emoji={metric.emoji}
              subtext={metric.subtext}
              tone={metric.tone}
              href={metric.href}
            />
          ))}
        </div>
      </div>

      {/* Commercial Application Pipeline */}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold text-slate-700 sm:mb-3 dark:text-slate-300">Sponsors &amp; exhibitors</h3>
        <div className="grid auto-rows-fr grid-cols-2 max-[339px]:grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
          {commercialMetrics.map((metric) => (
            <AdminMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              emoji={metric.emoji}
              subtext={metric.subtext}
              tone={metric.tone}
              href={metric.href}
            />
          ))}
        </div>
      </div>

      {/* Programme & Operational Flow */}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold text-slate-700 sm:mb-3 dark:text-slate-300">Programme &amp; enquiries</h3>
        <div className="grid auto-rows-fr grid-cols-2 max-[339px]:grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
          {programmeAndOperationsMetrics.map((metric) => (
            <AdminMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              emoji={metric.emoji}
              subtext={metric.subtext}
              tone={metric.tone}
              href={metric.href}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
