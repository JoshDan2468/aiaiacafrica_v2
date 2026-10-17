import { StatusBadge } from "@/components/common/StatusBadge";
import type { CommercialApplicationConfirmation as Confirmation } from "@/services/commercialApplication/commercialApplicationService";

export function CommercialApplicationConfirmation({
  confirmation,
}: {
  confirmation: Confirmation;
}) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: confirmation.currency,
    maximumFractionDigits: 0,
  }).format(confirmation.priceMinor / 100);
  return (
    <section
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8"
      role="status"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-forest">
        Application received
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
        {confirmation.reference}
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">Selected package</dt>
          <dd className="mt-1 font-semibold text-slate-900">{confirmation.selectedPackage.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">Published value</dt>
          <dd className="mt-1 font-semibold text-slate-900">{amount}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-slate-500">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={confirmation.status} />
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-sm leading-6 text-slate-700">{confirmation.nextStep}</p>
    </section>
  );
}
