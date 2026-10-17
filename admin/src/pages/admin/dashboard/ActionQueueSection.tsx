import { Link } from "react-router-dom";
import { BadgeCheck, ChevronRight } from "@/components/admin/adminIcons";
import type { AdminOverview } from "@/services/admin/adminOverviewService";

export function ActionQueueSection({ overview }: { overview: AdminOverview }) {
  const pendingPayments = overview.metrics.pendingPayments;
  const pendingAbstracts = overview.metrics.abstractPendingReview;
  const hasPendingItems = pendingPayments > 0 || pendingAbstracts > 0;

  return (
    <section
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-[#26303E] dark:bg-[#151B23]"
      aria-labelledby="action-queue-heading"
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 sm:items-center dark:border-[#26303E]">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <BadgeCheck className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="action-queue-heading" className="font-sans text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
              Pending review queue
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Items waiting for your review
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-slate-400">
          {pendingPayments + pendingAbstracts}{" "}
          {pendingPayments + pendingAbstracts === 1 ? "item" : "items"}
        </span>
      </div>

      {hasPendingItems ? (
        <ul className="divide-y divide-slate-100 pt-1 dark:divide-[#26303E]">
          {pendingPayments > 0 && (
            <li className="flex items-center justify-between gap-2.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40">
                  <span className="text-base select-none" aria-hidden="true">💳</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {pendingPayments} Pending {pendingPayments === 1 ? "Payment" : "Payments"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Registrations waiting for payment</p>
                </div>
              </div>
              <Link
                to="/admin/payments?status=PENDING"
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold text-[#173D2D] hover:bg-slate-100 dark:text-[#34D399] dark:hover:bg-[#1C2430]"
              >
                Review <ChevronRight className="size-3.5" />
              </Link>
            </li>
          )}
          {pendingAbstracts > 0 && (
            <li className="flex items-center justify-between gap-2.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40">
                  <span className="text-base select-none" aria-hidden="true">📑</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {pendingAbstracts} Abstract {pendingAbstracts === 1 ? "Submission" : "Submissions"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Abstracts waiting for review
                  </p>
                </div>
              </div>
              <Link
                to="/admin/abstract-submissions?status=SUBMITTED"
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold text-[#173D2D] hover:bg-slate-100 dark:text-[#34D399] dark:hover:bg-[#1C2430]"
              >
                Review <ChevronRight className="size-3.5" />
              </Link>
            </li>
          )}
        </ul>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center py-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[#1C2430] dark:text-[#34D399]">
            <span className="text-lg font-bold select-none">✓</span>
          </div>
          <p className="mt-3 font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
            You're all caught up
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Nothing requires attention right now
          </p>
        </div>
      )}
    </section>
  );
}

