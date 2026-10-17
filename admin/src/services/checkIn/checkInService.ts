import { apiRequest } from "@/services/api/client";

export type CheckInStatus =
  | "CHECKED_IN"
  | "VALID_ACTIVE_PASS"
  | "ALREADY_CHECKED_IN"
  | "INVALID_PASS"
  | "INACTIVE_PASS"
  | "REGISTRATION_NOT_ELIGIBLE"
  | "RECONCILIATION_REQUIRED";

export interface CheckInAttendee {
  name: string;
  registrationReference: string;
  category: string;
  emailVerificationStatus: string;
  paymentStatus: string;
  eventPassStatus: string | null;
  studentVerificationStatus: string | null;
}

export interface CheckInReview {
  status: CheckInStatus;
  attendee: CheckInAttendee | null;
  checkedInAt: string | null;
}

export type CheckInConfirmation =
  { method: "QR"; credential: string } | { method: "MANUAL_LOOKUP"; registrationReference: string };

export interface RecentCheckIn {
  name: string;
  registrationReference: string;
  category: string;
  checkedInAt: string;
  method: "QR" | "MANUAL_LOOKUP";
  staffName: string | null;
}

interface Envelope<T> {
  success: true;
  data: T;
}

async function request<T>(path: string, body?: unknown) {
  const response = await apiRequest<Envelope<T>>(`/admin/check-in${path}`, {
    ...(body === undefined ? {} : { method: "POST", body }),
  });
  return response.ok && response.data?.success && response.data.data
    ? { ok: true as const, data: response.data.data }
    : {
        ok: false as const,
        error: response.error ?? "The check-in response was unavailable. Please try again.",
      };
}

// Credentials remain in POST bodies and memory; they never become routes or browser storage.
export function validateEventPass(credential: string) {
  return request<CheckInReview>("/validate", { credential });
}

export function lookupCheckInAttendee(query: string) {
  return request<{ matches: CheckInReview[] }>("/lookup", { query });
}

export function confirmAttendeeCheckIn(input: CheckInConfirmation) {
  return request<CheckInReview>("/confirm", input);
}

export function getRecentCheckIns() {
  return request<{ items: RecentCheckIn[] }>("/recent?limit=20");
}

export function getCheckInCount() {
  return request<{ today: number; total: number }>("/count");
}
