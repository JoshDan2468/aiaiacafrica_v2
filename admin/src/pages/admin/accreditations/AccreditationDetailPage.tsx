import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableErrorState, AdminTableLoadingState } from "@/components/admin/AdminTable";
import { useAuth } from "@/hooks/useAuth";
import {
  getAccreditation,
  updateAccreditationStatus,
} from "@/services/accreditation/accreditationService";
import {
  formatAccreditationCategory,
  isDelegateCategory,
  isRepresentativeCategory,
  type Accreditation,
} from "@/types/accreditation";

function sourceLink(item: Accreditation) {
  if (item.sourceType === "SPONSOR_APPLICATION" && item.sourceReference)
    return `/admin/sponsor-applications/${encodeURIComponent(item.sourceReference)}`;
  if (item.sourceType === "EXHIBITOR_APPLICATION" && item.sourceReference)
    return `/admin/exhibitor-applications/${encodeURIComponent(item.sourceReference)}`;
  if (item.sourceType === "DELEGATE_REGISTRATION" && item.sourceId)
    return `/admin/delegates/${encodeURIComponent(item.sourceId)}`;
  return null;
}

function sourceDescription(item: Accreditation) {
  if (item.sourceType === "DELEGATE_REGISTRATION") return "Authoritative delegate registration";
  if (item.sourceType === "SPONSOR_APPLICATION") return "Sponsor organization application";
  if (item.sourceType === "EXHIBITOR_APPLICATION") return "Exhibitor organization application";
  return "Controlled Admin intake";
}

export function AccreditationDetailPage() {
  const { id } = useParams();
  const { admin } = useAuth();
  const canManage = admin?.permissions.includes("accreditations.manage") ?? false;
  const [record, setRecord] = useState<Accreditation | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pendingAction, setPendingAction] = useState<"APPROVED" | "REVOKED" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!id) {
      setState("error");
      return;
    }
    setState("loading");
    const result = await getAccreditation(id);
    if (!result.ok) {
      setState("error");
      return;
    }
    setRecord(result.accreditation);
    setState("ready");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") return <AdminTableLoadingState message="Loading accreditation…" />;
  if (state === "error" || !record)
    return (
      <AdminTableErrorState
        message="Accreditation could not be loaded."
        onRetry={() => void load()}
      />
    );

  const representative = isRepresentativeCategory(record.category);
  const delegate = isDelegateCategory(record.category);
  const canApprove = canManage && !delegate && !representative && record.status === "PENDING";
  const canRevoke = canManage && !delegate && ["PENDING", "APPROVED"].includes(record.status);
  const linkedSource = sourceLink(record);

  const save = async () => {
    if (!pendingAction || !id) return;
    setSaving(true);
    setMessage("");
    const result = await updateAccreditationStatus(id, pendingAction);
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setRecord(result.accreditation);
    setPendingAction(null);
    setMessage(
      pendingAction === "APPROVED"
        ? "Accreditation approved. No Event Pass or QR was issued."
        : "Accreditation revoked. No Event Pass or QR was issued.",
    );
  };

  const rows = [
    ["Full name", record.fullName],
    ["Email", record.email],
    ["Category", formatAccreditationCategory(record.category)],
    ["Event", record.eventCode],
    ["Organization", record.sourceOrganizationName || record.organizationName || "Not provided"],
    ["Country", record.country || "Not provided"],
    ["Source", sourceDescription(record)],
    ["Recorded", new Date(record.createdAt).toLocaleString("en-GB")],
    ["Updated", new Date(record.updatedAt).toLocaleString("en-GB")],
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin/accreditations"
          className="mb-2.5 inline-block text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          ← All accreditations
        </Link>
        <AdminPageHeader
          eyebrow="Operations / Accreditation"
          title={record.fullName}
          description={`${formatAccreditationCategory(record.category)} · ${record.eventCode}. This record alone does not grant admission.`}
          actions={<AdminStatusBadge status={record.status} />}
        />
      </div>

      {message && (
        <p
          role="status"
          className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
        >
          {message}
        </p>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
            Person and source
          </h2>
          <dl className="divide-y divide-slate-100 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
                <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-900">{value}</dd>
              </div>
            ))}
            <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
              <dt className="text-xs font-semibold text-slate-500">Source reference</dt>
              <dd className="font-semibold text-slate-900">
                {linkedSource ? (
                  <Link
                    to={linkedSource}
                    className="admin-accreditation-link hover:underline focus-visible:underline"
                  >
                    {record.sourceReference || "Open source record"}
                  </Link>
                ) : (
                  record.sourceReference || "Internal Admin intake"
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Eligibility boundary</h2>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {delegate
                ? "Delegate payment, email verification, and Student verification remain authoritative. This link is not a new eligibility decision."
                : representative
                  ? "This representative belongs to the linked organization application. Allocation and admission rules are deferred; representative approval is unavailable."
                  : "Admin approval records an accreditation decision only. Event Pass and QR issuance are not available in this step."}
            </p>
          </section>
          {canManage && (canApprove || canRevoke) && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900">Review accreditation</h2>
              <p className="mt-1 text-xs text-slate-500">
                Changes are attributed to your named Admin account.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {canApprove && (
                  <button
                    type="button"
                    onClick={() => setPendingAction("APPROVED")}
                    className="rounded-md bg-[#173D2D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#102C20]"
                  >
                    Approve accreditation
                  </button>
                )}
                {canRevoke && (
                  <button
                    type="button"
                    onClick={() => setPendingAction("REVOKED")}
                    className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    Revoke accreditation
                  </button>
                )}
              </div>
              {pendingAction && (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                  <p className="font-semibold">
                    Confirm {pendingAction === "APPROVED" ? "approval" : "revocation"} for{" "}
                    {record.fullName}?
                  </p>
                  <p className="mt-1">
                    This changes the accreditation status, not payment, verification, or Event Pass
                    state.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void save()}
                      disabled={saving}
                      className="rounded-md bg-[#173D2D] px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Confirm decision"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingAction(null)}
                      disabled={saving}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
