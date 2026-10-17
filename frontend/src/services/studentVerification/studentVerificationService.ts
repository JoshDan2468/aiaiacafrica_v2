import { API_BASE_URL, apiRequest } from "@/services/api/client";
import type { DelegateRegistrationConfirmation } from "@/services/delegate/delegateTypes";
import { uploadError } from "./studentEvidenceErrors";
import type {
  StudentEvidenceList,
  StudentEvidenceMetadata,
  StudentEvidenceReadiness,
  StudentEvidenceType,
  StudentVerificationPublicState,
} from "./studentVerificationTypes";
export type {
  StudentVerificationStatus,
  StudentEvidenceType,
  StudentEvidenceMetadata,
  StudentEvidenceReadiness,
  StudentEvidenceList,
  StudentVerificationPublicState,
} from "./studentVerificationTypes";

export interface StudentApplicationPayload {
  packageId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  telephone?: string | undefined;
  country: string;
  mainObjective: string;
  heardAboutSource: string;
  privacyConsent: true;
  dataSharingConsent: boolean;
  institutionName: string;
  institutionCountry: string;
  programmeOfStudy: string;
  studentIdentificationNumber: string;
  expectedGraduationYear: number;
  institutionalEmail?: string | undefined;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

async function evidenceRequest<T>(
  path: string,
  continuationToken: string,
  options: RequestInit = {},
) {
  try {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("X-AIAIAC-Continuation-Token", continuationToken);
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
    });
    const body = (await response.json().catch(() => null)) as T | null;
    if (!response.ok) {
      return { ok: false as const, status: response.status, error: uploadError(response.status) };
    }
    return { ok: true as const, status: response.status, data: body as T };
  } catch {
    return {
      ok: false as const,
      status: 0,
      error: "We could not reach the evidence service. Check your connection and try again.",
    };
  }
}

export async function submitStudentApplication(payload: StudentApplicationPayload) {
  const result = await apiRequest<ApiEnvelope<DelegateRegistrationConfirmation>>(
    "/student-delegate-applications",
    { method: "POST", body: payload },
  );
  return result.ok && result.data
    ? { ok: true as const, registration: result.data.data }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getStudentEvidence(reference: string, continuationToken: string) {
  const result = await evidenceRequest<ApiEnvelope<{ evidence: StudentEvidenceList }>>(
    `/student-delegate-applications/${encodeURIComponent(reference)}/evidence`,
    continuationToken,
  );
  return result.ok && result.data
    ? { ok: true as const, evidence: result.data.data.evidence }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getStudentVerificationState(reference: string, continuationToken: string) {
  const result = await evidenceRequest<
    ApiEnvelope<{ verification: StudentVerificationPublicState }>
  >(
    `/student-delegate-applications/${encodeURIComponent(reference)}/verification`,
    continuationToken,
  );
  return result.ok && result.data
    ? { ok: true as const, verification: result.data.data.verification }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function submitStudentVerification(reference: string, continuationToken: string) {
  const result = await evidenceRequest<
    ApiEnvelope<{ registrationReference: string; verificationStatus: "PENDING" }>
  >(
    `/student-delegate-applications/${encodeURIComponent(reference)}/verification/submit`,
    continuationToken,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function requestStudentVerificationRecovery(input: {
  registrationReference: string;
  email: string;
}) {
  const result = await apiRequest<{ success: true; message: string }>(
    "/student-verification-recovery/request",
    { method: "POST", body: input },
  );
  return result.ok
    ? { ok: true as const, message: result.data?.message ?? "Check your email for next steps." }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function exchangeStudentVerificationRecovery(recoveryToken: string) {
  const result = await apiRequest<
    ApiEnvelope<{
      registrationReference: string;
      continuationToken: string;
      continuationTokenExpiresAt: string;
    }>
  >("/student-verification-recovery/exchange", {
    method: "POST",
    body: { recoveryToken },
  });
  return result.ok && result.data
    ? { ok: true as const, access: result.data.data }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function uploadStudentEvidence(options: {
  reference: string;
  continuationToken: string;
  evidenceType: StudentEvidenceType;
  file: File;
  replacementEvidenceId?: string | undefined;
}) {
  const form = new FormData();
  form.append("file", options.file);
  const suffix = options.replacementEvidenceId
    ? `/${encodeURIComponent(options.replacementEvidenceId)}/replace`
    : "";
  const result = await evidenceRequest<
    ApiEnvelope<{ evidence: StudentEvidenceMetadata; readiness: StudentEvidenceReadiness }>
  >(
    `/student-delegate-applications/${encodeURIComponent(options.reference)}/evidence${suffix}`,
    options.continuationToken,
    {
      method: "POST",
      headers: { "X-AIAIAC-Evidence-Type": options.evidenceType },
      body: form,
    },
  );
  return result.ok && result.data
    ? { ok: true as const, result: result.data.data }
    : { ok: false as const, status: result.status, error: result.error };
}
