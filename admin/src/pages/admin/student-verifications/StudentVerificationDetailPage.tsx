import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, LoaderCircle, RotateCcw } from "@/components/admin/adminIcons";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableErrorState, AdminTableLoadingState } from "@/components/admin/AdminTable";
import { useAuth } from "@/hooks/useAuth";
import {
  approveStudentVerification,
  downloadAdminStudentEvidence,
  getAdminStudentVerification,
  rejectStudentVerification,
  requestMoreStudentInformation,
  retryStudentVerificationNotification,
  type StudentEvidenceMetadata,
  type StudentVerificationAdminDetail,
} from "@/services/studentVerification/studentVerificationAdminService";

type ReviewAction = "approve" | "request-more" | "reject";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-GB") : "Not yet";
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function EvidenceDocument({
  reference,
  evidence,
}: {
  reference: string;
  evidence: StudentEvidenceMetadata;
}) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  return (
    <li className="rounded-md border border-slate-200 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-900">{formatLabel(evidence.evidenceType)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {evidence.displayFilename} · {(evidence.sizeBytes / 1024).toFixed(0)} KB · versioned
            evidence
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Uploaded {formatDate(evidence.uploadedAt)} · scan {formatLabel(evidence.scanStatus)}
          </p>
        </div>
        <AdminStatusBadge status={evidence.documentStatus} />
      </div>
      {evidence.documentStatus === "AVAILABLE" && evidence.scanStatus === "CLEAN" && (
        <button
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#05190F] hover:underline disabled:opacity-50"
          type="button"
          disabled={state === "working"}
          onClick={() => {
            setState("working");
            void downloadAdminStudentEvidence(
              reference,
              evidence.evidenceId,
              evidence.displayFilename,
            ).then((result) => setState(result.ok ? "idle" : "error"));
          }}
        >
          <Download className="size-3.5" aria-hidden="true" />
          {state === "working" ? "Downloading…" : "Download private evidence"}
        </button>
      )}
      {state === "error" && (
        <p className="mt-2 text-xs font-medium text-rose-600" role="alert">
          The evidence document could not be downloaded.
        </p>
      )}
    </li>
  );
}

export function StudentVerificationDetailPage() {
  const { reference } = useParams();
  const { admin } = useAuth();
  const [verification, setVerification] = useState<StudentVerificationAdminDetail | null>(null);
  const [pageState, setPageState] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [actionState, setActionState] = useState<"idle" | "working" | "error">("idle");
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!reference) {
      setPageState("error");
      return;
    }
    const result = await getAdminStudentVerification(reference);
    if (!result.ok) {
      setPageState("error");
      return;
    }
    setVerification(result.verification);
    setPageState("ready");
  }, [reference]);

  useEffect(() => {
    void load();
  }, [load]);

  if (pageState === "loading") {
    return <AdminTableLoadingState message="Loading Student verification…" />;
  }
  if (pageState === "error" || !verification) {
    return <AdminTableErrorState message="We could not load this Student verification." />;
  }

  const canReview = admin?.permissions.includes("student_verifications.review") ?? false;
  const reasonRequired = action === "request-more" || action === "reject";
  const detailRows = [
    ["Delegate", verification.delegateName],
    ["Application email", verification.email],
    ["Institution", verification.institutionName],
    ["Institution country", verification.institutionCountry],
    ["Programme", verification.programmeOfStudy],
    ["Student number", verification.studentIdentificationNumber],
    ["Expected graduation", String(verification.expectedGraduationYear)],
    ["Institutional email", verification.institutionalEmail || "Not provided"],
    ["Submitted", formatDate(verification.submittedAt)],
    ["Reviewed", formatDate(verification.reviewedAt)],
  ];

  const confirmReview = async () => {
    if (!action || !reference) return;
    setActionState("working");
    const result =
      action === "approve"
        ? await approveStudentVerification(reference, note.trim() || undefined)
        : action === "request-more"
          ? await requestMoreStudentInformation(reference, note.trim())
          : await rejectStudentVerification(reference, note.trim());
    if (!result.ok) {
      setActionState("error");
      return;
    }
    setAction(null);
    setNote("");
    setActionState("idle");
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2.5 transition-colors"
          to="/admin/student-verifications"
        >
          <ArrowLeft className="size-3.5" /> Student verification queue
        </Link>
        <AdminPageHeader
          eyebrow="Registration / Student Delegate Review"
          title={verification.registrationReference}
          description="Review the student's application details and uploaded documents. Every decision is saved to the application history."
          actions={<AdminStatusBadge status={verification.verificationStatus} />}
        />
      </div>

      {canReview && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          {verification.verificationStatus === "PENDING" ? (
            <>
              <button
                className="rounded-md bg-[#05190F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#05190F]/90 transition-colors"
                type="button"
                onClick={() => setAction("approve")}
              >
                Approve eligibility
              </button>
              <button
                className="rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                type="button"
                onClick={() => setAction("request-more")}
              >
                Request more information
              </button>
              <button
                className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors"
                type="button"
                onClick={() => setAction("reject")}
              >
                Reject application
              </button>
            </>
          ) : (
            <p className="text-xs font-medium text-slate-500">
              Review actions are available only while an application is pending.
            </p>
          )}
          <button
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            type="button"
            onClick={() => {
              setNotificationMessage(null);
              void retryStudentVerificationNotification(verification.registrationReference).then(
                (result) =>
                  setNotificationMessage(
                    result.ok
                      ? `${result.attempted} pending notification${result.attempted === 1 ? "" : "s"} processed.`
                      : "Pending notifications could not be processed.",
                  ),
              );
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Retry notification
          </button>
        </div>
      )}

      {notificationMessage && (
        <p
          className="rounded-md bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700"
          role="status"
        >
          {notificationMessage}
        </p>
      )}

      {action && (
        <section
          className="rounded-lg border border-[#05190F]/20 bg-white p-5 shadow-xs"
          aria-live="polite"
        >
          <h2 className="font-sans text-base font-bold text-slate-900">
            Confirm {action === "approve" ? "approval" : formatLabel(action)}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            This decision updates the student’s verification status and is saved to the application
            history.
          </p>
          <label className="mt-4 block text-xs font-semibold text-slate-700">
            <span className="flex items-center justify-between gap-2">
              <span>
                {reasonRequired
                  ? "Reason (required, at least 10 characters)"
                  : "Internal note (optional)"}
              </span>
              {reasonRequired && (
                <span className="font-normal text-slate-500">
                  {note.trim().length}/10 minimum characters
                </span>
              )}
            </span>
            <textarea
              className="mt-1.5 min-h-24 w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
              value={note}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {actionState === "error" && (
            <p className="mt-2.5 text-xs font-medium text-rose-600" role="alert">
              The decision could not be saved. The application may have changed; refresh and retry.
            </p>
          )}
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#05190F] px-4 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#05190F]/90 transition-colors"
              type="button"
              disabled={actionState === "working" || (reasonRequired && note.trim().length < 10)}
              onClick={() => void confirmReview()}
            >
              {actionState === "working" && (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Confirm decision
            </button>
            <button
              className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              type="button"
              disabled={actionState === "working"}
              onClick={() => {
                setAction(null);
                setNote("");
                setActionState("idle");
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
            {detailRows.map(([label, value]) => (
              <div className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]" key={label}>
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className="break-words font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="font-sans text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Private evidence
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            Minimum readiness:{" "}
            <span className="font-semibold text-slate-700">
              {verification.evidenceReadiness.minimumEvidenceReady ? "ready" : "not ready"}
            </span>
          </p>
          <ul className="mt-3.5 space-y-2.5">
            {verification.evidence.map((evidence) => (
              <EvidenceDocument
                key={evidence.evidenceId}
                reference={verification.registrationReference}
                evidence={evidence}
              />
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="font-sans text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          Decision history
        </h2>
        <ol className="mt-3.5 space-y-3">
          {verification.history.map((item) => (
            <li className="border-l-2 border-emerald-600 pl-3.5" key={item.id}>
              <p className="text-xs font-semibold text-slate-900">
                {formatLabel(item.action)} · {formatLabel(item.fromStatus)} →{" "}
                {formatLabel(item.toStatus)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {formatDate(item.createdAt)}
                {item.reviewerName ? ` · ${item.reviewerName}` : " · Applicant"}
              </p>
              {item.note && <p className="mt-1 text-xs text-slate-700">{item.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
