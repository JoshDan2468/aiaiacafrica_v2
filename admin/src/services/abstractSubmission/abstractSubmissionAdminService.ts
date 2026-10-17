import { apiRequest } from "@/services/api/client";
import type { AbstractAnalysis } from "./abstractAnalysisTypes";
import type { AbstractStatus } from "./abstractSubmissionTypes";
export type { AbstractStatus } from "./abstractSubmissionTypes";

export interface AbstractListItem {
  aiAnalysis?: AbstractAnalysis;
  reference: string;
  authorName: string;
  organizationName: string;
  country: string;
  title: string;
  wordCount: number;
  status: AbstractStatus;
  submittedAt: string;
  resubmittedAt: string | null;
}

export interface AbstractAdminDetail extends AbstractListItem {
  authorEmail: string;
  authorPhone: string;
  jobTitle: string | null;
  abstractBody: string;
  keywords: string | null;
  topic: string | null;
  currentReviewReason: string | null;
  reviewerName: string | null;
  reviewStartedAt: string | null;
  decidedAt: string | null;
  history: {
    id: string;
    action: string;
    fromStatus: AbstractStatus | null;
    toStatus: AbstractStatus;
    reviewerName: string | null;
    authorVisibleReason: string | null;
    internalNote: string | null;
    wordCount: number;
    createdAt: string;
  }[];
}

interface Envelope<T> {
  success: true;
  data: T;
}

export async function listAbstracts(query: URLSearchParams) {
  const result = await apiRequest<
    Envelope<{
      submissions: {
        items: AbstractListItem[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>
  >(`/admin/abstract-submissions?${query.toString()}`);
  return result.ok && result.data?.data.submissions
    ? { ok: true as const, submissions: result.data.data.submissions }
    : { ok: false as const, error: result.error };
}

export async function getAdminAbstract(reference: string) {
  const result = await apiRequest<Envelope<{ submission: AbstractAdminDetail }>>(
    `/admin/abstract-submissions/${encodeURIComponent(reference)}`,
  );
  return result.ok && result.data?.data.submission
    ? { ok: true as const, submission: result.data.data.submission }
    : { ok: false as const, error: result.error };
}

export async function reviewAbstract(
  reference: string,
  action: "start-review" | "accept" | "request-revision" | "reject",
  body: { reason?: string; note?: string },
) {
  const result = await apiRequest<Envelope<unknown>>(
    `/admin/abstract-submissions/${encodeURIComponent(reference)}/${action}`,
    { method: "POST", body },
  );
  return result.ok ? { ok: true as const } : { ok: false as const, error: result.error };
}

export async function retryAbstractNotification(reference: string) {
  const result = await apiRequest<Envelope<{ attempted: number }>>(
    `/admin/abstract-submissions/${encodeURIComponent(reference)}/notifications/retry`,
    { method: "POST", body: {} },
  );
  return result.ok && result.data
    ? { ok: true as const, attempted: result.data.data.attempted }
    : { ok: false as const, error: result.error };
}

export async function retryAbstractAnalysis(reference: string) {
  const result = await apiRequest<Envelope<{ queued: boolean }>>(
    `/admin/abstract-submissions/${encodeURIComponent(reference)}/analysis/retry`,
    { method: "POST", body: {} },
  );
  return result.ok
    ? { ok: true as const }
    : {
        ok: false as const,
        error:
          result.status === 409
            ? "Retry is not available yet. Refresh the analysis status and try again later."
            : result.error,
      };
}
