import { API_BASE_URL, apiRequest, handleAdminUnauthorized } from "@/services/api/client";
import { uploadError } from "./studentEvidenceErrors";
import type {
  StudentEvidenceMetadata,
  StudentEvidenceReadiness,
  StudentVerificationPublicState,
  StudentVerificationStatus,
} from "./studentVerificationTypes";
export type {
  StudentEvidenceMetadata,
  StudentVerificationStatus,
} from "./studentVerificationTypes";

export interface StudentVerificationHistoryItem {
  id: string;
  action: "SUBMITTED" | "RESUBMITTED" | "MORE_INFORMATION_REQUIRED" | "APPROVED" | "REJECTED";
  fromStatus: StudentVerificationStatus;
  toStatus: StudentVerificationStatus;
  reviewerName: string | null;
  note: string | null;
  createdAt: string;
}

export interface StudentVerificationAdminDetail extends StudentVerificationPublicState {
  delegateName: string;
  email: string;
  institutionName: string;
  institutionCountry: string;
  programmeOfStudy: string;
  studentIdentificationNumber: string;
  expectedGraduationYear: number;
  institutionalEmail: string | null;
  createdAt: string;
  history: StudentVerificationHistoryItem[];
}

export interface StudentVerificationListItem {
  registrationReference: string;
  delegateName: string;
  institutionName: string;
  institutionCountry: string;
  programmeOfStudy: string;
  verificationStatus: StudentVerificationStatus;
  emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  evidence: StudentEvidenceMetadata[];
  evidenceReadiness: StudentEvidenceReadiness;
}

export interface StudentVerificationListFilters {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  status?: StudentVerificationStatus | undefined;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

function toQuery(filters: StudentVerificationListFilters): string {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function getAdminStudentVerifications(filters: StudentVerificationListFilters) {
  const result = await apiRequest<
    ApiEnvelope<{
      verifications: {
        items: StudentVerificationListItem[];
        total: number;
        page: number;
        limit: number;
      };
    }>
  >(`/admin/student-verifications${toQuery(filters)}`);
  return result.ok && result.data
    ? { ok: true as const, verifications: result.data.data.verifications }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getAdminStudentVerification(reference: string) {
  const result = await apiRequest<ApiEnvelope<{ verification: StudentVerificationAdminDetail }>>(
    `/admin/student-verifications/${encodeURIComponent(reference)}`,
  );
  return result.ok && result.data
    ? { ok: true as const, verification: result.data.data.verification }
    : { ok: false as const, status: result.status, error: result.error };
}

async function adminReviewRequest(
  reference: string,
  action: "approve" | "request-more-information" | "reject",
  body: { note?: string | undefined; reason?: string | undefined },
) {
  const result = await apiRequest<
    ApiEnvelope<{ registrationReference: string; verificationStatus: StudentVerificationStatus }>
  >(`/admin/student-verifications/${encodeURIComponent(reference)}/${action}`, {
    method: "POST",
    body,
  });
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, status: result.status, error: result.error };
}

export function approveStudentVerification(reference: string, note?: string) {
  return adminReviewRequest(reference, "approve", note ? { note } : {});
}

export function requestMoreStudentInformation(reference: string, reason: string) {
  return adminReviewRequest(reference, "request-more-information", { reason });
}

export function rejectStudentVerification(reference: string, reason: string) {
  return adminReviewRequest(reference, "reject", { reason });
}

export async function retryStudentVerificationNotification(reference: string) {
  const result = await apiRequest<ApiEnvelope<{ attempted: number }>>(
    `/admin/student-verifications/${encodeURIComponent(reference)}/notifications/retry`,
    { method: "POST", body: {} },
  );
  return result.ok && result.data
    ? { ok: true as const, attempted: result.data.data.attempted }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function downloadAdminStudentEvidence(
  reference: string,
  evidenceId: string,
  displayFilename: string,
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/student-verifications/${encodeURIComponent(reference)}/evidence/${encodeURIComponent(evidenceId)}/download`,
      { credentials: "include", headers: { Accept: "application/octet-stream" } },
    );
    handleAdminUnauthorized("/admin/student-verifications/evidence/download", response.status);
    if (!response.ok) return { ok: false as const, error: uploadError(response.status) };
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = displayFilename;
    anchor.click();
    URL.revokeObjectURL(url);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "The evidence document could not be downloaded." };
  }
}
