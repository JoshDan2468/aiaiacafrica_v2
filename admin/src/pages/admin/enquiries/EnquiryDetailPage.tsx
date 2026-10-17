import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "@/components/admin/adminIcons";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableErrorState, AdminTableLoadingState } from "@/components/admin/AdminTable";
import { useAuth } from "@/hooks/useAuth";
import {
  changeEnquiryStatus,
  getEnquiry,
  retryEnquiryNotifications,
  type EnquiryDetail,
} from "@/services/enquiry/enquiryAdminService";

type Action = "in-progress" | "resolve" | "close";

export function EnquiryDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const { admin } = useAuth();
  const canManage = Boolean(admin?.permissions.includes("enquiries.manage"));
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!reference) {
      setState("error");
      return;
    }
    setState("loading");
    const result = await getEnquiry(reference);
    if (!result.ok) {
      setState("error");
      return;
    }
    setEnquiry(result.enquiry);
    setState("ready");
  }, [reference]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!reference || !action) return;
    setWorking(true);
    setMessage("");
    const result = await changeEnquiryStatus(reference, action, note.trim());
    setWorking(false);
    if (!result.ok) {
      setMessage(result.error ?? "Failed to update enquiry status.");
      return;
    }
    setAction(null);
    setNote("");
    setMessage("Enquiry status saved.");
    await load();
  };

  if (state === "loading") {
    return <AdminTableLoadingState message="Loading enquiry details…" />;
  }
  if (state === "error" || !enquiry) {
    return (
      <AdminTableErrorState message="Unable to load enquiry details." onRetry={() => void load()} />
    );
  }

  const actions: { id: Action; label: string }[] =
    enquiry.status === "OPEN"
      ? [
          { id: "in-progress", label: "Mark in progress" },
          { id: "resolve", label: "Resolve enquiry" },
          { id: "close", label: "Close enquiry" },
        ]
      : enquiry.status === "IN_PROGRESS"
        ? [
            { id: "resolve", label: "Resolve enquiry" },
            { id: "close", label: "Close enquiry" },
          ]
        : enquiry.status === "RESOLVED"
          ? [{ id: "close", label: "Close enquiry" }]
          : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/enquiries"
          className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" /> Back to enquiries
        </Link>
        <AdminPageHeader
          eyebrow="Operations / Enquiry Review"
          title={enquiry.reference}
          description="Internal status tracking only. This does not send a response to the visitor."
          actions={<AdminStatusBadge status={enquiry.status} />}
        />
      </div>

      {message && (
        <p
          className="rounded-md bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700"
          role="status"
        >
          {message}
        </p>
      )}

      {canManage && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="border-b border-slate-100 pb-2.5 font-sans text-sm font-bold text-slate-900">
            Actions
          </h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {actions.map((item) => (
              <button
                key={item.id}
                className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                onClick={() => setAction(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            {actions.length === 0 && (
              <p className="text-xs text-slate-500">This enquiry is closed.</p>
            )}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              className="text-xs font-semibold text-[#05190F] hover:underline"
              type="button"
              onClick={() =>
                void retryEnquiryNotifications(enquiry.reference).then((result) =>
                  setMessage(
                    result.ok
                      ? `Notification retry checked (${result.attempted} attempted).`
                      : (result.error ?? "Retry failed."),
                  ),
                )
              }
            >
              Retry pending notifications
            </button>
          </div>
        </section>
      )}

      {action && canManage && (
        <form
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h3 className="font-sans text-sm font-bold text-slate-900">
            Confirm action: {action.replaceAll("-", " ")}
          </h3>
          <div>
            <label
              htmlFor="enquiry-note"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Internal note (optional)
            </label>
            <textarea
              id="enquiry-note"
              aria-label="Internal note (optional)"
              maxLength={1000}
              className="mt-1.5 block min-h-24 w-full rounded-md border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Internal tracking note..."
            />
          </div>
          <div className="flex gap-2.5">
            <button
              className="rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#05190F]/90 disabled:opacity-50"
              disabled={working}
              type="submit"
            >
              {working ? "Saving…" : "Confirm status"}
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              type="button"
              onClick={() => {
                setAction(null);
                setNote("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-sans text-sm font-bold text-slate-900">Enquiry Message</h2>
            <p className="text-[11px] text-slate-500">Subject and full enquiry text</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Subject
            </span>
            <p className="mt-0.5 font-semibold text-slate-900">{enquiry.subject}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Category
            </span>
            <p className="mt-0.5 text-xs text-slate-700 capitalize">
              {enquiry.category.toLowerCase().replaceAll("_", " ")}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Message Content
            </span>
            <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
              {enquiry.message}
            </p>
          </div>
        </section>
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-sans text-sm font-bold text-slate-900">Sender Details</h2>
            <p className="text-[11px] text-slate-500">Contact information provided</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sender Name
            </span>
            <p className="mt-0.5 font-semibold text-slate-900">
              {enquiry.sender || `${enquiry.firstName} ${enquiry.lastName}`.trim()}
            </p>
            <p className="text-xs text-slate-500">{enquiry.email}</p>
            {enquiry.phone && <p className="text-xs text-slate-500">{enquiry.phone}</p>}
            {enquiry.organization && (
              <p className="mt-1 text-xs text-slate-600">{enquiry.organization}</p>
            )}
            {enquiry.country && <p className="text-xs text-slate-500">{enquiry.country}</p>}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Submitted At
            </span>
            <p className="mt-0.5 text-xs text-slate-700">
              {new Date(enquiry.submittedAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </section>
      </div>

      {enquiry.history.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-sans text-sm font-bold text-slate-900">Activity History</h2>
            <p className="text-[11px] text-slate-500">Internal status audit trail</p>
          </div>
          <ol className="mt-3 divide-y divide-slate-100 text-xs">
            {enquiry.history.map((event) => (
              <li key={event.id} className="py-2.5">
                <p className="font-semibold text-slate-900">
                  {event.action.replaceAll("_", " ")}: {event.fromStatus || "None"} →{" "}
                  {event.toStatus}
                </p>
                <p className="text-[11px] text-slate-500">
                  {new Date(event.createdAt).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  by {event.adminName || "System"}
                </p>
                {event.internalNote && <p className="mt-1 text-slate-600">{event.internalNote}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
