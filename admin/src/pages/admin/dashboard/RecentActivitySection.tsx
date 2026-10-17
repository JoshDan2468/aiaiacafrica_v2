import { Clock } from "@/components/admin/adminIcons";
import type { AdminRecentActivity } from "@/services/admin/adminOverviewService";

export function RecentActivitySection({ items }: { items: AdminRecentActivity[] }) {
  return (
    <section
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-[#26303E] dark:bg-[#151B23]"
      aria-labelledby="recent-activity-heading"
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 sm:items-center dark:border-[#26303E]">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <Clock className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="recent-activity-heading" className="font-sans text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
              Recent activity
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Latest registrations, reviews, and updates
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-slate-400">
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {items.length ? (
        <ol className="divide-y divide-slate-100 dark:divide-[#26303E]">
          {items.map((item) => (
            <li
              className="grid gap-1 rounded-[8px] px-2 py-3 text-xs transition-colors hover:bg-slate-50/50 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 dark:hover:bg-white/5"
              key={`${item.type}-${item.occurredAt}`}
            >
              <div className="flex min-w-0 items-start gap-2 sm:items-center">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400 sm:mt-0" aria-hidden="true" />
                <p className="min-w-0 break-words font-medium text-slate-800 dark:text-slate-200">{item.summary}</p>
              </div>
              <time className="pl-3.5 font-mono text-[11px] text-slate-400 sm:pl-0" dateTime={item.occurredAt}>
                {new Date(item.occurredAt).toLocaleString("en-GB", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-6 text-center text-xs text-slate-500">
          No recent activity yet.
        </p>
      )}
    </section>
  );
}
