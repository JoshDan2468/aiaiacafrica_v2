import { useCallback, useEffect, useState } from "react";
import { AbstractAnalysisPanel } from "./AbstractAnalysisPanel";
import { ArrowLeft } from "@/components/admin/adminIcons";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableErrorState, AdminTableLoadingState } from "@/components/admin/AdminTable";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminAbstract,
  retryAbstractNotification,
  reviewAbstract,
  type AbstractAdminDetail,
} from "@/services/abstractSubmission/abstractSubmissionAdminService";

type ReviewAction = "accept" | "request-revision" | "reject";

export function AbstractSubmissionDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const { admin } = useAuth();
  const canReview = Boolean(admin?.permissions.includes("abstracts.review"));
  const [submission, setSubmission] = useState<AbstractAdminDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!reference) {
      setState("error");
      return;
    }
    setState("loading");
    const result = await getAdminAbstract(reference);
    if (!result.ok) {
      setState("error");
      return;
    }
    setSubmission(result.submission);
    setState("ready");
  }, [reference]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStartReview = async () => {
    if (!reference) return;
    setWorking(true);
    setMessage("");
    const result = await reviewAbstract(reference, "start-review", {});
    setWorking(false);
    if (!result.ok) {
      setMessageIsError(true);
      setMessage(result.error ?? "Failed to start review.");
      return;
    }
    setMessageIsError(false);
    setMessage("Review started successfully.");
    await load();
  };

  const saveDecision = async () => {
    if (!reference || !action) return;
    setWorking(true);
    setMessage("");
    const body: { reason?: string; note?: string } = {};
    if (reason.trim()) body.reason = reason.trim();
    if (note.trim()) body.note = note.trim();
    const result = await reviewAbstract(reference, action, body);
    setWorking(false);
    if (!result.ok) {
      setMessageIsError(true);
      setMessage(result.error ?? "The decision could not be saved. Refresh and try again.");
      return;
    }
    setAction(null);
    setNote("");
    setReason("");
    setMessageIsError(false);
    setMessage("Review decision saved.");
    await load();
  };

  if (state === "loading") {
    return <AdminTableLoadingState message="Loading abstract submission details…" />;
  }
  if (state === "error" || !submission) {
    return (
      <AdminTableErrorState
        message="Unable to load abstract submission."
        onRetry={() => void load()}
      />
    );
  }

  const canStart = submission.status === "SUBMITTED";
  const canDecide = submission.status === "UNDER_REVIEW";
  const reasonRequired = action === "request-revision" || action === "reject";
  const details = [
    ["Author", submission.authorName],
    ["Email", submission.authorEmail],
    ["Phone", submission.authorPhone],
    ["Organization", submission.organizationName],
    ["Job title", submission.jobTitle || "Not provided"],
    ["Country", submission.country],
    ["Title", submission.title],
    ["Words", String(submission.wordCount)],
    ["Topic", submission.topic || "Not selected"],
    ["Keywords", submission.keywords || "Not provided"],
    ["Submitted", new Date(submission.submittedAt).toLocaleString("en-GB")],
    [
      "Resubmitted",
      submission.resubmittedAt
        ? new Date(submission.resubmittedAt).toLocaleString("en-GB")
        : "Not yet",
    ],
    ["Current reviewer", submission.reviewerName || "Not assigned"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/abstract-submissions"
          className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" /> Back to abstract submissions
        </Link>
        <AdminPageHeader
          eyebrow="Programme / Abstract Review"
          title={submission.reference}
          description="Abstract acceptance indicates peer-review approval only. It does not issue a Delegate Pass."
          actions={<AdminStatusBadge status={submission.status} />}
        />
      </div>

      {message && (
        <p
          className="rounded-md bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700"
          role={messageIsError ? "alert" : "status"}
        >
          {message}
        </p>
      )}

      {!canReview && (
        <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
          You can read this abstract. Starting review and approving it require the abstracts.review
          permission.
        </p>
      )}
      {canReview && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          {canStart && (
            <>
              <button
                className="rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#05190F]/90 disabled:opacity-50"
                disabled={working}
                type="button"
                onClick={() => void handleStartReview()}
              >
                {working ? "Starting…" : "Start review"}
              </button>
              <span className="text-xs text-slate-500">
                Click Start review to unlock the Approve, Request revision, and Reject buttons.
              </span>
            </>
          )}
          {canDecide && (
            <>
              <button
                className="rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#05190F]/90"
                type="button"
                onClick={() => setAction("accept")}
              >
                Approve abstract
              </button>
              <button
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                type="button"
                onClick={() => setAction("request-revision")}
              >
                Request revision
              </button>
              <button
                className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                type="button"
                onClick={() => setAction("reject")}
              >
                Reject
              </button>
            </>
          )}
          <button
            className="ml-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
            type="button"
            onClick={() =>
              void retryAbstractNotification(submission.reference).then((result) =>
                setMessage(
                  result.ok
                    ? `Notification retry checked (${result.attempted} attempted).`
                    : (result.error ?? "Retry failed."),
                ),
              )
            }
          >
            Retry pending notification
          </button>
        </div>
      )}

      {action && canDecide && (
        <form
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
          onSubmit={(event) => {
            event.preventDefault();
            void saveDecision();
          }}
        >
          <h3 className="font-sans text-sm font-bold text-slate-900">
            {action === "accept"
              ? "Confirm abstract approval"
              : `Confirm action: ${action.replaceAll("-", " ")}`}
          </h3>
          {reasonRequired && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="decision-reason"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Reason provided to author
                </label>
                <span className="text-xs text-slate-500">
                  {reason.trim().length}/10 minimum characters
                </span>
              </div>
              <textarea
                id="decision-reason"
                required
                minLength={10}
                maxLength={1000}
                className="mt-1.5 block min-h-24 w-full rounded-md border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain the review outcome to the author..."
              />
            </div>
          )}
          <div>
            <label
              htmlFor="internal-note"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Internal reviewer note (optional)
            </label>
            <textarea
              id="internal-note"
              className="mt-1.5 block min-h-20 w-full rounded-md border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Internal notes visible to reviewers only..."
            />
          </div>
          <div className="flex gap-2.5">
            <button
              className="rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#05190F]/90 disabled:opacity-50"
              disabled={working || (reasonRequired && reason.trim().length < 10)}
              type="submit"
            >
              {working ? "Saving…" : "Confirm Decision"}
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              type="button"
              onClick={() => {
                setAction(null);
                setNote("");
                setReason("");
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
            <h2 className="font-sans text-sm font-bold text-slate-900">Abstract Details</h2>
            <p className="text-[11px] text-slate-500">
              Submitted manuscript and presentation topic
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Title
            </span>
            <p className="mt-1 font-semibold text-slate-900">{submission.title}</p>
          </div>
          {submission.topic && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Topic Track
              </span>
              <p className="mt-1 text-xs text-slate-800">{submission.topic}</p>
            </div>
          )}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Abstract Text
            </span>
            <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
              {submission.abstractBody}
            </p>
          </div>
          {submission.keywords && (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Keywords
              </span>
              <p className="mt-1 text-xs text-slate-800">{submission.keywords}</p>
            </div>
          )}
          {submission.currentReviewReason && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <span className="font-semibold">Current Review Feedback:</span>{" "}
              {submission.currentReviewReason}
            </div>
          )}
        </section>
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-sans text-sm font-bold text-slate-900">Author Information</h2>
            <p className="text-[11px] text-slate-500">Lead author and contact details</p>
          </div>
          <dl className="divide-y divide-slate-100 text-xs">
            {details.map(([label, value]) => (
              <div className="grid gap-1 py-2" key={label}>
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className="font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <AbstractAnalysisPanel
        analysis={submission.aiAnalysis}
        reference={submission.reference}
        canReview={canReview}
        onRefresh={load}
      />
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">Submission documents</h2>
        <p className="mt-2 text-sm text-slate-600">
          Authors submit their complete abstract text in the form above. Separate file attachments
          are not used for abstract review.
        </p>
      </section>
      {submission.history.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-sans text-sm font-bold text-slate-900">Review History</h2>
            <p className="text-[11px] text-slate-500">Audit trail of editorial decisions</p>
          </div>
          <ol className="mt-3 divide-y divide-slate-100 text-xs">
            {submission.history.map((event) => (
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
                  by {event.reviewerName || "System"} · {event.wordCount} words
                </p>
                {event.authorVisibleReason && (
                  <p className="mt-1 text-slate-700 italic">"{event.authorVisibleReason}"</p>
                )}
                {event.internalNote && <p className="mt-1 text-slate-600">{event.internalNote}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
