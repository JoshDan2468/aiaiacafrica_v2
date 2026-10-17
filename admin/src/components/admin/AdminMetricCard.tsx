import { Link, useInRouterContext } from "react-router-dom";
import type { TablerIcon } from "./adminIcons";
import { ChevronRight } from "./adminIcons";
import { cn } from "@/lib/utils";

export type MetricTone = "emerald" | "indigo" | "amber" | "cyan" | "purple" | "rose" | "default";

const toneStyles: Record<MetricTone, string> = {
  emerald:
    "border-[#C4EBD8] bg-[#E8F7F0] text-[#065F46] dark:border-[#065F46]/40 dark:bg-[#064E3B]/30 dark:text-[#34D399]",
  indigo:
    "border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] dark:border-[#3730A3]/40 dark:bg-[#312E81]/30 dark:text-[#A5B4FC]",
  amber:
    "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] dark:border-[#92400E]/40 dark:bg-[#78350F]/30 dark:text-[#FCD34D]",
  cyan:
    "border-[#A5F3FC] bg-[#ECFEFF] text-[#0E7490] dark:border-[#0E7490]/40 dark:bg-[#164E63]/30 dark:text-[#67E8F9]",
  purple:
    "border-[#E9D5FF] bg-[#FAF5FF] text-[#6B21A8] dark:border-[#6B21A8]/40 dark:bg-[#581C87]/30 dark:text-[#D8B4FE]",
  rose:
    "border-[#FECDD3] bg-[#FFF1F2] text-[#9F1239] dark:border-[#9F1239]/40 dark:bg-[#881337]/30 dark:text-[#FDA4AF]",
  default:
    "border-[#BDE3CC] bg-[#EAF5EF] text-[#05190F] dark:border-[#10B981]/30 dark:bg-[#064E3B]/30 dark:text-[#34D399]",
};

const toneAccentBars: Record<MetricTone, { side: string; top: string }> = {
  emerald: { side: "bg-[#10B981]", top: "bg-[#10B981]" },
  indigo: { side: "bg-[#4F46E5]", top: "bg-[#4F46E5]" },
  amber: { side: "bg-[#F59E0B]", top: "bg-[#F59E0B]" },
  cyan: { side: "bg-[#06B6D4]", top: "bg-[#06B6D4]" },
  purple: { side: "bg-[#8B5CF6]", top: "bg-[#8B5CF6]" },
  rose: { side: "bg-[#F43F5E]", top: "bg-[#F43F5E]" },
  default: { side: "bg-[#05190F] dark:bg-[#10B981]", top: "bg-[#05190F] dark:bg-[#10B981]" },
};

interface AdminMetricCardProps {
  label: string;
  value: string | number;
  icon?: TablerIcon | undefined;
  emoji?: string | undefined;
  subtext?: string | undefined;
  badge?: string | undefined;
  tone?: MetricTone | undefined;
  href?: string | undefined;
  className?: string | undefined;
}

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  emoji,
  subtext,
  badge,
  tone = "default",
  href,
  className,
}: AdminMetricCardProps) {
  const inRouter = useInRouterContext();
  const accent = toneAccentBars[tone] || toneAccentBars.default;

  const cardContent = (
    <>
      {/* Side and Top Colored Accent Strips (Matching Screenshot 1 & 2 design) */}
      <span
        className={cn("absolute inset-y-0 left-0 w-1.5 transition-colors", accent.side)}
        aria-hidden="true"
      />
      <span
        className={cn("absolute inset-x-0 top-0 h-1 transition-colors", accent.top)}
        aria-hidden="true"
      />

      {/* Header Row: Rounded Icon Container (Left) + View / Badge (Right) */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-colors sm:size-11 sm:rounded-xl",
            toneStyles[tone],
          )}
        >
          {emoji ? (
            <span className="text-base leading-none select-none sm:text-2xl" aria-hidden="true">
              {emoji}
            </span>
          ) : Icon ? (
            <Icon className="size-4 sm:size-5.5" stroke={1.8} aria-hidden="true" />
          ) : null}
        </div>
        {href ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100/90 px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition-all group-hover:bg-[#05190F] group-hover:text-white sm:px-2.5 sm:py-1 dark:bg-[#1C2430] dark:text-slate-300 dark:group-hover:bg-[#15803D] dark:group-hover:text-white">
            <span className="hidden sm:inline">View list</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : badge ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:px-2.5 sm:py-1 sm:text-[11px] dark:bg-[#1C2430] dark:text-slate-300">
            {badge}
          </span>
        ) : null}
      </div>

      {/* Numerical Metric & Label */}
      <div className="mt-2.5 sm:mt-4 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={cn(
              "min-w-0 break-words font-sans font-extrabold leading-none tracking-tight text-slate-900 dark:text-slate-100",
              typeof value === "string" && value.length > 7
                ? "text-[16px] sm:text-[24px] lg:text-[26px]"
                : "text-[22px] sm:text-[32px] lg:text-[34px]",
            )}
          >
            {value}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-slate-600 sm:mt-1.5 sm:text-[13px] dark:text-slate-300">
          {label}
        </p>
      </div>

      {/* Subtext with semantic status highlight */}
      {subtext && (
        <div className="mt-2 flex items-center gap-1 text-[10.5px] font-medium leading-tight sm:mt-2.5 sm:text-[12px]">
          {subtext.startsWith("↑") || subtext.startsWith("✓") ? (
            <span className="line-clamp-1 font-semibold text-emerald-600 dark:text-emerald-400">
              {subtext}
            </span>
          ) : subtext.startsWith("⏳") || subtext.toLowerCase().includes("pending") || subtext.toLowerCase().includes("awaiting") ? (
            <span className="line-clamp-1 text-amber-600 dark:text-amber-400">
              {subtext}
            </span>
          ) : (
            <span className="line-clamp-1 text-slate-400 dark:text-slate-400">
              {subtext}
            </span>
          )}
        </div>
      )}
    </>
  );

  const cardClasses = cn(
    "group relative flex h-full min-h-[128px] sm:min-h-[160px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 pl-3.5 sm:p-5 sm:pl-5.5 shadow-2xs transition-all duration-200 dark:border-[#26303E] dark:bg-[#151B23]",
    href &&
      "cursor-pointer active:scale-[0.99] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:hover:border-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]",
    className,
  );

  if (href) {
    if (inRouter) {
      return (
        <Link to={href} className={cardClasses} aria-label={`View ${label} list`}>
          {cardContent}
        </Link>
      );
    }
    return (
      <a href={href} className={cardClasses} aria-label={`View ${label} list`}>
        {cardContent}
      </a>
    );
  }

  return <div className={cardClasses}>{cardContent}</div>;
}
