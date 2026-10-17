import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  titleAriaLabel?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function AdminPageHeader({
  eyebrow,
  title,
  titleAriaLabel,
  description,
  actions,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="border-b border-slate-200 pb-4 sm:pb-6 dark:border-white/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-[12px] font-medium text-slate-500 sm:text-[13px] dark:text-slate-400">{eyebrow}</p>}
          <h1
            aria-label={titleAriaLabel}
            className="mt-1 font-sans text-[22px] font-bold tracking-tight text-slate-900 sm:text-[28px] lg:text-[30px] dark:text-slate-100"
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-slate-500 sm:text-[14px] dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-2.5">{actions}</div>}
      </div>
      {children && <div className="mt-3.5">{children}</div>}
    </div>
  );
}
