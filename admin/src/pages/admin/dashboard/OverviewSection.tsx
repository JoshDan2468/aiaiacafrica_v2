import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export function OverviewSection({ firstName }: { firstName: string }) {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="AIAIAC Africa 2027"
        title="Overview"
        titleAriaLabel={`Welcome back, ${firstName}`}
        description={`Welcome back, ${firstName}. Here is the latest summary of registrations, payments, and pending reviews.`}
      />
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#05190F] via-[#0B2619] to-[#123524] p-4 text-white shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white sm:text-lg">
              AIAIAC Africa 2027 Admin Portal
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/75 sm:text-sm">
              Lagos, Nigeria · 22 to 23 June 2027 · Live conference registrations and attendee coordination
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-[#6EE7B7] sm:text-xs">
              <span className="size-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
              Live event overview
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
