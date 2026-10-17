import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "@/components/admin/adminIcons";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableErrorState, AdminTableLoadingState } from "@/components/admin/AdminTable";
import { useAuth } from "@/hooks/useAuth";
import {
  decideCommercialApplication,
  getCommercialApplication,
  retryCommercialNotification,
  type CommercialApplicationDetail,
  type CommercialApplicationKind,
} from "@/services/commercialApplication/commercialApplicationAdminService";

type ReviewAction = "confirm" | "request-more-information" | "decline";

export function CommercialApplicationDetailPage({ kind }: { kind: CommercialApplicationKind }) {
  const { reference } = useParams();
  const { admin } = useAuth();
  const noun = kind === "SPONSOR" ? "Sponsor" : "Exhibitor";
  const segment = kind === "SPONSOR" ? "sponsor" : "exhibitor";
  const permission = kind === "SPONSOR" ? "sponsors.manage" : "exhibitors.manage";
  const [application, setApplication] = useState<CommercialApplicationDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!reference) {
      setState("error");
      return;
    }
    const result = await getCommercialApplication(kind, reference);
    if (!result.ok) {
      setState("error");
      return;
    }
    setApplication(result.application);
    setState("ready");
  }, [kind, reference]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") return <AdminTableLoadingState />;
  if (state === "error" || !application) return <AdminTableErrorState />;

  const canManage = admin?.permissions.includes(permission) ?? false;
  const actionable = ["SUBMITTED", "MORE_INFORMATION_REQUIRED"].includes(application.status);
  const reasonRequired = action === "request-more-information" || action === "decline";
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(application.priceMinor / 100);

  const save = async () => {
    if (!action || !reference) return;
    setDecisionError("");
    setWorking(true);
    const body = reasonRequired
      ? { reason: note.trim() }
      : note.trim()
        ? { note: note.trim() }
        : {};
    const result = await decideCommercialApplication(kind, reference, action, body);
    setWorking(false);
    if (!result.ok) {
      setDecisionError(result.error ?? "The decision could not be recorded. Please try again.");
      return;
    }
    setAction(null);
    setNote("");
    await load();
  };

  const rows = [
    ["Organization", application.organizationName],
    [
      "Record source",
      application.origin === "MANUAL_IMPORT" ? "Manually approved import" : "Public application",
    ],
    ...(application.importSource ? [["Import source", application.importSource]] : []),
    ...(application.approvalEvidence ? [["Approval evidence", application.approvalEvidence]] : []),
    ["Country", application.country],
    ["Website", application.website || "Not provided"],
    ["Industry", application.industry || "Not provided"],
    ["Primary contact", `${application.contactFirstName} ${application.contactLastName}`],
    ["Work email", application.contactEmail],
    ["Phone", application.contactPhone],
    ["Job title", application.contactJobTitle || "Not provided"],
    ["Package", application.packageName],
    ["Published value", amount],
    ["Applicant notes", application.applicantNotes || "Not provided"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2.5 transition-colors"
          to={`/admin/${segment}-applications`}
        >
          <ArrowLeft className="size-3.5" /> {noun} applications
        </Link>
        <AdminPageHeader
          eyebrow={`Commercial / ${noun} Application`}
          title={application.reference}
          description="Confirmation records a business decision only; it does not create payment, revenue, or an Event Pass."
          actions={<AdminStatusBadge status={application.status} />}
        />
        {canManage && (
          <Link
            className="mt-3 inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#173D2D] hover:bg-slate-50"
            to={`/admin/accreditations?category=${kind === "SPONSOR" ? "SPONSOR_REPRESENTATIVE" : "EXHIBITOR_REPRESENTATIVE"}&sourceApplicationReference=${encodeURIComponent(application.reference)}`}
          >
            Manage individual representatives →
          </Link>
        )}
      </div>

      {!canManage && (
        <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
          You can read this application. Approval requires the {permission} permission.
        </p>
      )}
      {decisionError && (
        <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          {decisionError}
        </p>
      )}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          {actionable ? (
            <>
              <button
                className="rounded-md bg-[#05190F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#05190F]/90 transition-colors"
                type="button"
                onClick={() => setAction("confirm")}
              >
                Approve {noun.toLowerCase()}
              </button>
              <button
                className="rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                type="button"
                onClick={() => setAction("request-more-information")}
              >
                Request information
              </button>
              <button
                className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors"
                type="button"
                onClick={() => setAction("decline")}
              >
                Decline application
              </button>
            </>
          ) : (
            <span className="text-xs font-medium text-slate-500">
              No further decision required for current status.
            </span>
          )}
          <button
            className="ml-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            type="button"
            onClick={() => void retryCommercialNotification(kind, application.reference)}
          >
            Retry notification
          </button>
        </div>
      )}

      {action && (
        <section className="space-y-3 rounded-lg border border-[#05190F]/20 bg-white p-5 shadow-xs">
          <h2 className="font-sans text-sm font-bold text-slate-900">
            {action === "confirm"
              ? `Approve ${noun.toLowerCase()} application`
              : action === "request-more-information"
                ? "Request more information"
                : "Decline application"}
          </h2>
          <p className="text-xs text-slate-500">
            This action changes the application status and notifies the primary contact.
          </p>
          <textarea
            aria-label={reasonRequired ? "Decision reason" : "Decision note"}
            className="min-h-24 w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
            placeholder={
              reasonRequired ? "Provide reason (required)…" : "Internal note (optional)…"
            }
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex gap-2.5">
            <button
              className="rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#05190F]/90 transition-colors"
              disabled={working || (reasonRequired && !note.trim())}
              type="button"
              onClick={() => void save()}
            >
              {working
                ? "Saving…"
                : action === "confirm"
                  ? `Confirm ${noun.toLowerCase()} approval`
                  : "Submit decision"}
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              type="button"
              onClick={() => {
                setAction(null);
                setNote("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="font-sans text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Application details
          </h2>
          <dl className="divide-y divide-slate-100 text-xs">
            {rows.map(([label, value]) => (
              <div className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]" key={label}>
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className="font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="font-sans text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Decision history
          </h2>
          <ol className="divide-y divide-slate-100 text-xs">
            {application.history.map((event) => (
              <li className="py-2.5" key={event.id}>
                <p className="font-semibold text-slate-900">
                  {event.action.replace(/_/g, " ")}: {event.fromStatus || "None"} → {event.toStatus}
                </p>
                <p className="text-[11px] text-slate-500">
                  {new Date(event.createdAt).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  by {event.reviewerName || "System"}
                </p>
                {event.applicantReason && (
                  <p className="mt-1 text-slate-700 italic">"{event.applicantReason}"</p>
                )}
                {event.internalNote && <p className="mt-1 text-slate-600">{event.internalNote}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
