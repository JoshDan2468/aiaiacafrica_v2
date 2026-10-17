import { useState } from "react";
import { Clock, FileText } from "@/components/admin/adminIcons";
import {
  analysisStatusLabels,
  type AbstractAnalysis,
} from "@/services/abstractSubmission/abstractAnalysisTypes";
import { retryAbstractAnalysis } from "@/services/abstractSubmission/abstractSubmissionAdminService";

const criterionLabels = {
  relevance: "Conference relevance",
  clarity: "Clarity",
  methodology: "Methodology",
  contribution: "Technical contribution",
  completeness: "Completeness",
} as const;
const failureMessages: Record<string, string> = {
  OUTCOME_UNKNOWN:
    "The provider outcome is uncertain. Automatic retry is paused to avoid duplicate charges. An operator must investigate.",
  INVALID_RESPONSE: "The provider returned an analysis that could not be validated.",
  PROVIDER_REFUSAL: "The provider did not return an assessment. Human review remains available.",
  PROVIDER_CONFIGURATION: "The provider configuration needs attention.",
  PROVIDER_UNAVAILABLE: "The provider is temporarily unavailable.",
  PROVIDER_RATE_LIMIT: "The provider rate limit was reached.",
  BUDGET_LIMIT: "The analysis spending limit was reached.",
  CONFIG_CHANGED: "The analysis configuration changed. An operator must review the queued job.",
  INPUT_LIMIT: "The analysis input exceeds the configured limit.",
};
export function AbstractAnalysisPanel({
  analysis,
  reference,
  canReview,
  onRefresh,
}: {
  analysis?: AbstractAnalysis | undefined;
  reference: string;
  canReview: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const status = analysis?.status ?? "DISABLED";
  const result = analysis?.result;
  const retry = async () => {
    setWorking(true);
    const response = await retryAbstractAnalysis(reference);
    setMessage(
      response.ok
        ? "Analysis queued. The worker will process it in the background."
        : (response.error ?? "Analysis could not be retried."),
    );
    setWorking(false);
    if (response.ok) await onRefresh();
  };
  return (
    <section
      aria-label="AI advisory analysis"
      className="min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-xs dark:border-[#29352D] dark:bg-[#151F19] dark:text-slate-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-[#29352D]">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <FileText className="size-4" aria-hidden="true" />
          AI advisory analysis
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-[#25332A] dark:text-slate-100">
          <Clock className="size-3.5" aria-hidden="true" />
          {analysisStatusLabels[status]}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        AI observations support human review. The score uses a draft rubric and does not determine
        acceptance, rejection or revision.
      </p>
      {status === "DISABLED" && (
        <p className="text-sm">
          AI analysis is disabled. Review this abstract using the existing human review actions.
        </p>
      )}
      {status === "NOT_QUEUED" && (
        <p className="text-sm">
          No analysis was queued for this submission. Historical abstracts are not processed
          automatically.
        </p>
      )}
      {status === "UNAVAILABLE" && (
        <p className="text-sm">
          Analysis is temporarily unavailable. Human review remains available.
        </p>
      )}
      {(status === "QUEUED" || status === "PROCESSING") && (
        <p className="text-sm">
          Analysis is running in the background. You can continue human review and refresh this
          panel later.
        </p>
      )}
      {status === "OUTDATED" && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          This analysis concerns earlier content. Do not use its score as an assessment of the
          current submission.
        </p>
      )}
      {status === "FAILED" && (
        <p className="text-sm">
          {failureMessages[analysis?.failureCode ?? ""] ??
            "Analysis could not be completed. Human review remains available."}
        </p>
      )}
      {status === "QUEUED" && analysis?.failureCode && (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          A temporary failure was recorded. A bounded retry is scheduled.
        </p>
      )}
      {result && (
        <div className="space-y-5 break-words text-sm">
          <div>
            <h3 className="font-semibold">
              {status === "OUTDATED" ? "Earlier AI summary" : "AI summary"}
            </h3>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{result.summary}</p>
          </div>
          <div>
            <h3 className="font-semibold">Suggested technical categories</h3>
            {result.categories.length ? (
              <ul className="mt-2 space-y-2">
                {result.categories.map((item) => (
                  <li key={item.category}>
                    <span className="font-semibold">{item.category}</span>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">{item.explanation}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">No category was supported by the supplied text.</p>
            )}
          </div>
          <div className="rounded-md bg-slate-50 p-4 dark:bg-[#1C2A20]">
            <h3 className="font-semibold">
              {status === "OUTDATED" ? "Earlier advisory score" : "Advisory quality score"}:{" "}
              {result.advisoryScore}/100
            </h3>
            <p className="mt-1">{result.scoreExplanation}</p>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              Draft rubric · 0 absent, 1 weak, 2 partial, 3 adequate, 4 strong. The weighted total
              is calculated by the server.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Criterion breakdown</h3>
            <dl className="mt-2 grid gap-3 sm:grid-cols-2">
              {Object.entries(criterionLabels).map(([key, label]) => {
                const criterion = result.criteria[key as keyof typeof criterionLabels];
                return (
                  <div
                    key={key}
                    className="min-w-0 rounded-md border border-slate-200 p-3 dark:border-[#29352D]"
                  >
                    <dt className="font-semibold">
                      {label}: {criterion.score}/4{" "}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        ({analysis?.rubric?.weights[key] ?? "—"}%)
                      </span>
                    </dt>
                    <dd className="mt-1 text-slate-600 dark:text-slate-300">
                      {criterion.explanation}
                      {criterion.evidence && (
                        <blockquote className="mt-2 border-l-2 border-slate-300 pl-2 italic dark:border-slate-600">
                          {criterion.evidence}
                        </blockquote>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
          <div>
            <h3 className="font-semibold">Potential issues for human review</h3>
            {result.issues.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">
                No potential issues were reported. This does not verify scientific validity or
                originality.
              </p>
            )}
          </div>
        </div>
      )}
      {analysis?.sourceRevision && (
        <details className="break-all text-xs text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer">Analysis record</summary>
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline font-semibold">Source revision: </dt>
              <dd className="inline">{analysis.sourceRevision}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Rubric: </dt>
              <dd className="inline">{analysis.rubric?.version} (draft)</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Prompt: </dt>
              <dd className="inline">{analysis.promptVersion}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Model: </dt>
              <dd className="inline">{analysis.model}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Completed: </dt>
              <dd className="inline">
                {analysis.completedAt
                  ? new Date(analysis.completedAt).toLocaleString("en-GB")
                  : "Not completed"}
              </dd>
            </div>
          </dl>
        </details>
      )}
      {status !== "DISABLED" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={working}
            onClick={() => void onRefresh()}
            className="min-h-10 rounded-md border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-[#29352D] dark:hover:bg-[#25332A]"
          >
            Refresh analysis
          </button>
          {canReview && analysis?.canRetry && (
            <button
              type="button"
              disabled={working}
              onClick={() => void retry()}
              className="min-h-10 rounded-md bg-[#05190F] px-3 text-xs font-semibold text-white disabled:opacity-50 dark:bg-[#D1E34E] dark:text-[#05190F]"
            >
              {working ? "Queueing…" : "Retry failed analysis"}
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
