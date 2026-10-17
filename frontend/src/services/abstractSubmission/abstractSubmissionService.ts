import { apiRequest } from "@/services/api/client";
import type { AbstractStatus } from "./abstractSubmissionTypes";
export type { AbstractStatus } from "./abstractSubmissionTypes";

export interface AbstractContent {
  title: string;
  abstractBody: string;
  keywords?: string;
  topic?: string;
}

export interface AbstractSubmissionPayload extends AbstractContent {
  idempotencyKey: string;
  authorFirstName: string;
  authorLastName: string;
  authorEmail: string;
  authorPhone: string;
  organizationName: string;
  jobTitle?: string;
  country: string;
  consent: true;
}

export interface AbstractAccess {
  reference: string;
  continuationToken: string;
  continuationTokenExpiresAt: string;
}

export interface AbstractConfirmation extends AbstractAccess {
  title: string;
  wordCount: number;
  status: AbstractStatus;
  submittedAt: string;
  nextStep: string;
}

export interface AbstractWorkspace {
  reference: string;
  title: string;
  abstractBody: string;
  wordCount: number;
  keywords: string | null;
  topic: string | null;
  status: AbstractStatus;
  submittedAt: string;
  resubmittedAt: string | null;
  currentReviewReason: string | null;
  editingAllowed: boolean;
  resubmissionAllowed: boolean;
  paymentAvailable: false;
}

interface Envelope<T> {
  success: true;
  data: T;
  message?: string;
}

export function countAbstractWords(body: string): number {
  const trimmed = body.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

export function createAbstractIdempotencyKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function clean<T extends object>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value !== undefined),
  ) as T;
}

export async function submitAbstract(payload: AbstractSubmissionPayload) {
  const result = await apiRequest<Envelope<AbstractConfirmation>>("/abstract-submissions", {
    method: "POST",
    body: clean(payload),
  });
  return result.ok && result.data?.data
    ? { ok: true as const, confirmation: result.data.data }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getAbstractWorkspace(access: AbstractAccess) {
  const result = await apiRequest<Envelope<{ workspace: AbstractWorkspace }>>(
    `/abstract-submissions/${encodeURIComponent(access.reference)}/workspace`,
    { headers: { "X-AIAIAC-Continuation-Token": access.continuationToken } },
  );
  return result.ok && result.data?.data.workspace
    ? { ok: true as const, workspace: result.data.data.workspace }
    : { ok: false as const, error: result.error };
}

export async function saveAbstractRevision(access: AbstractAccess, content: AbstractContent) {
  const result = await apiRequest<Envelope<{ workspace: AbstractWorkspace }>>(
    `/abstract-submissions/${encodeURIComponent(access.reference)}/revision`,
    {
      method: "PATCH",
      headers: { "X-AIAIAC-Continuation-Token": access.continuationToken },
      body: clean(content),
    },
  );
  return result.ok && result.data?.data.workspace
    ? { ok: true as const, workspace: result.data.data.workspace }
    : { ok: false as const, error: result.error };
}

export async function resubmitAbstract(access: AbstractAccess) {
  const result = await apiRequest<Envelope<{ workspace: AbstractWorkspace }>>(
    `/abstract-submissions/${encodeURIComponent(access.reference)}/resubmit`,
    {
      method: "POST",
      headers: { "X-AIAIAC-Continuation-Token": access.continuationToken },
      body: {},
    },
  );
  return result.ok && result.data?.data.workspace
    ? { ok: true as const, workspace: result.data.data.workspace }
    : { ok: false as const, error: result.error };
}

export async function requestAbstractRecovery(reference: string, email: string) {
  const result = await apiRequest<Envelope<unknown>>("/abstract-submission-recovery/request", {
    method: "POST",
    body: { reference, email },
  });
  return result.ok
    ? {
        ok: true as const,
        message: result.data?.message ?? "If the details match, a secure link will be sent.",
      }
    : { ok: false as const, error: result.error };
}

export async function exchangeAbstractRecovery(recoveryToken: string) {
  const result = await apiRequest<Envelope<{ access: AbstractAccess }>>(
    "/abstract-submission-recovery/exchange",
    { method: "POST", body: { recoveryToken } },
  );
  return result.ok && result.data?.data.access
    ? { ok: true as const, access: result.data.data.access }
    : { ok: false as const, error: result.error };
}
