import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "@/components/admin/adminIcons";
import { Link, useParams } from "react-router-dom";
import {
  getAdminDelegate,
  type DelegateRegistrationDetail,
} from "@/services/delegate/delegateAdminService";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableErrorState, AdminTableLoadingState } from "@/components/admin/AdminTable";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatPrice(value: number | null, currency: string | null) {
  if (value === null || currency === null) return "To be confirmed — payment unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function DelegateDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState<"loading" | "ready" | "error" | "not-found">("loading");
  const [registration, setRegistration] = useState<DelegateRegistrationDetail | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setState("not-found");
      return;
    }
    setState("loading");
    const result = await getAdminDelegate(id);
    if (!result.ok) {
      setState(result.status === 404 ? "not-found" : "error");
      return;
    }
    setRegistration(result.registration);
    setState("ready");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") {
    return <AdminTableLoadingState message="Loading protected delegate record…" />;
  }

  if (state !== "ready" || !registration) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/delegates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" /> Return to delegate directory
        </Link>
        <AdminTableErrorState
          message={
            state === "not-found"
              ? "Delegate record not found."
              : "We could not load this delegate record."
          }
          onRetry={load}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/delegates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2.5 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Delegate Directory
        </Link>
        <AdminPageHeader
          eyebrow="Protected Registration Record"
          title={`${registration.firstName} ${registration.lastName}`}
          description={`Ref: ${registration.reference} • Submitted ${formatDate(registration.submittedAt)}`}
          actions={
            <div className="flex items-center gap-2">
              <AdminStatusBadge
                status={
                  registration.registrationStatus === "SUBMITTED"
                    ? "REGISTERED"
                    : registration.registrationStatus
                }
              />
              <AdminStatusBadge status={registration.emailVerificationStatus} />
              <AdminStatusBadge status={registration.paymentStatus} />
            </div>
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DetailGroup
          title="Identity & Contact Information"
          rows={[
            ["Full Name", `${registration.firstName} ${registration.lastName}`],
            ["Email Address", registration.email],
            ["Email Ownership", registration.emailVerificationStatus],
            ["Mobile Phone", registration.mobile],
            ["Telephone", registration.telephone || "Not provided"],
            ["Country", registration.country],
          ]}
        />

        <DetailGroup
          title="Professional Details"
          rows={[
            ["Job Title", registration.jobTitle],
            ["Organization", registration.companyName],
            ["Primary Activity", registration.primaryActivity],
            ["Main Objective", registration.mainObjective],
            ["Discovery Channel", registration.heardAboutSource],
          ]}
        />

        <DetailGroup
          title="Package & Pricing Snapshot"
          rows={[
            ["Package Name", registration.packageName],
            ["Category Type", registration.packageType],
            ["Price Rate", formatPrice(registration.priceMinor, registration.currency)],
            ["Description", registration.packageDescription],
          ]}
        >
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Included Benefits
            </p>
            <ul className="space-y-1 text-xs text-slate-700">
              {registration.packageBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <span className="text-[#05190F]">•</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </DetailGroup>

        <DetailGroup
          title="Privacy & Data Sharing Consents"
          rows={[
            ["Privacy Policy Consent", registration.privacyConsent ? "Granted" : "Not Granted"],
            ["Partner Data Sharing", registration.dataSharingConsent ? "Granted" : "Not Granted"],
          ]}
        />

        <DetailGroup
          title="Audit & Metadata"
          rows={[
            ["Submitted At", formatDate(registration.submittedAt)],
            ["Created At", formatDate(registration.createdAt)],
            ["Last Updated At", formatDate(registration.updatedAt)],
            ["Payment Status", registration.paymentStatus],
            [
              "Authoritative Payment",
              registration.authoritativePayment
                ? `${registration.authoritativePayment.source} / ${registration.authoritativePayment.method} — ${registration.authoritativePayment.paymentReference}`
                : "None",
            ],
            [
              "Email Verified At",
              registration.emailVerifiedAt
                ? formatDate(registration.emailVerifiedAt)
                : "Not verified",
            ],
          ]}
        />
      </div>
    </div>
  );
}

function DetailGroup({
  title,
  rows,
  children,
}: {
  title: string;
  rows: [string, string][];
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="font-sans text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
        {title}
      </h2>
      <dl className="divide-y divide-slate-100 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}
