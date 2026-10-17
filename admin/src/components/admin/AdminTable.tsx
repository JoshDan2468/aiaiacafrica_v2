import type { ReactNode } from "react";
import { CircleAlert, Inbox, LoaderCircle } from "./adminIcons";
import { cn } from "@/lib/utils";

interface AdminTableProps {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}

export function AdminTable({ children, className, minWidth = "min-w-[44rem] sm:min-w-[50rem]" }: AdminTableProps) {
  return (
    <div
      className={cn(
        "w-full max-w-full overflow-x-auto overscroll-x-contain rounded-[14px] border border-slate-200 bg-white dark:border-[#26303E] dark:bg-[#151B23]",
        className,
      )}
    >
      <table className={cn("w-full border-collapse text-left", minWidth)}>{children}</table>
    </div>
  );
}

export function AdminTableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="h-11 border-b border-slate-200 bg-slate-50 text-[12px] font-semibold text-slate-500 sm:h-12 sm:text-[13px] dark:border-[#26303E] dark:bg-[#1C2430] dark:text-slate-400">
      {children}
    </thead>
  );
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-700 sm:text-sm dark:divide-[#26303E] dark:text-slate-200">
      {children}
    </tbody>
  );
}

export function AdminTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("group h-[52px] transition-colors hover:bg-slate-50/70 sm:h-[60px] dark:hover:bg-white/[0.035]", className)}>
      {children}
    </tr>
  );
}

export function AdminTableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5 align-middle text-[13px] sm:px-4 sm:py-3.5 sm:text-[14px]", className)}>{children}</td>;
}

export function AdminTableHeaderCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" className={cn("px-3 py-2.5 font-semibold sm:px-4 sm:py-3", className)}>
      {children}
    </th>
  );
}

export function AdminTableLoadingState({ message = "Loading data…" }: { message?: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[14px] border border-slate-200 bg-white py-12 text-slate-500 dark:border-[#26303E] dark:bg-[#151B23]">
      <LoaderCircle className="size-5 animate-spin text-[#05190F] dark:text-[#34D399]" />
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}

export function AdminTableErrorState({
  message = "Failed to load data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[14px] border border-slate-200 bg-white py-12 text-center dark:border-[#26303E] dark:bg-[#151B23]">
      <div className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <CircleAlert className="size-5" />
      </div>
      <p className="mt-3 font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#334155] dark:bg-[#1C2430] dark:text-slate-200 dark:hover:bg-[#222C3A]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function AdminTableEmptyState({
  title = "No records found",
  description = "No records match your current search or filters.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[14px] border border-slate-200 bg-white py-12 text-center dark:border-[#26303E] dark:bg-[#151B23]">
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-[#1C2430] dark:text-slate-400">
        <Inbox className="size-5" />
      </div>
      <p className="mt-3 font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}
