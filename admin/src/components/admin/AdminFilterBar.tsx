import type { ReactNode } from "react";
import { FilterX } from "./adminIcons";

interface AdminFilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  resultCount?: string | number;
  title?: string;
}

export function AdminFilterBar({
  children,
  onReset,
  onSubmit,
  resultCount,
  title = "Filter records",
}: AdminFilterBarProps) {
  return (
    <form onSubmit={onSubmit} className="rounded-[14px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-800">{title}</span>
          {resultCount !== undefined && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {resultCount}{" "}
              {typeof resultCount === "number" ? (resultCount === 1 ? "record" : "records") : ""}
            </span>
          )}
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <FilterX className="size-3.5" aria-hidden="true" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">{children}</div>
    </form>
  );
}

export const adminFilterInputClass =
  "h-11 w-full min-w-40 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#173D2D] focus:ring-[3px] focus:ring-[#173D2D]/[0.12]";
