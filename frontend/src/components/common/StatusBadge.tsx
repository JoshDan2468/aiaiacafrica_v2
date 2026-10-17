import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

interface StatusBadgeProps {
  status: string;
  tone?: BadgeTone;
  className?: string;
}

function resolveTone(status: string): BadgeTone {
  const normalized = status.toUpperCase().replace(/\s+/g, "_");
  switch (normalized) {
    case "ACTIVE":
    case "ACCEPTED":
    case "APPROVED":
    case "PAID":
    case "VERIFIED":
    case "SENT":
    case "CONFIRMED":
    case "RESOLVED":
    case "REGISTERED":
      return "success";
    case "PENDING":
    case "SUBMITTED":
    case "IN_PROGRESS":
    case "DUPLICATE_SUCCESS":
    case "RECONCILIATION_REQUIRED":
      return "warning";
    case "DISABLED":
    case "REVOKED":
    case "REJECTED":
    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
    case "CLOSED":
    case "REVERSED":
      return "danger";
    case "NOT_SENT":
    case "NOT_SUBMITTED":
    case "REFUNDED":
      return "neutral";
    case "MORE_INFORMATION_REQUIRED":
    case "REVISION_REQUIRED":
    case "UNDER_REVIEW":
    case "OPEN":
      return "info";
    default:
      return "neutral";
  }
}

const toneStyles: Record<BadgeTone, string> = {
  success: "border-[#CBE8D5] bg-[#E4F5EA] text-[#247648]",
  warning: "border-[#F2DFAE] bg-[#FFF3D7] text-[#8C6500]",
  danger: "border-[#F0CACA] bg-[#FCE7E7] text-[#A63C3C]",
  neutral: "border-[#E0E5E2] bg-[#EFF2F0] text-[#68756D]",
  info: "border-[#D8E0E7] bg-[#EDF1F5] text-[#536474]",
};

const dotStyles: Record<BadgeTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  neutral: "bg-slate-400",
  info: "bg-sky-500",
};

export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const activeTone = tone ?? resolveTone(status);
  const formattedLabel = status.replace(/_/g, " ");

  return (
    <span
      data-tone={activeTone}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-[9px] text-xs font-semibold capitalize tracking-normal",
        toneStyles[activeTone],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full shrink-0", dotStyles[activeTone])}
        aria-hidden="true"
      />
      {formattedLabel.toLowerCase()}
    </span>
  );
}
