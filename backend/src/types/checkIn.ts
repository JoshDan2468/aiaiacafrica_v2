export type CheckInStatus =
  | "CHECKED_IN"
  | "VALID_ACTIVE_PASS"
  | "ALREADY_CHECKED_IN"
  | "INVALID_PASS"
  | "INACTIVE_PASS"
  | "REGISTRATION_NOT_ELIGIBLE"
  | "RECONCILIATION_REQUIRED";

export type CheckInMethod = "QR" | "MANUAL_LOOKUP";

export interface CheckInAttendee {
  readonly name: string;
  readonly registrationReference: string;
  readonly category: "PROFESSIONAL" | "STUDENT";
  readonly emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  readonly paymentStatus: string;
  readonly eventPassStatus: "ACTIVE" | "REVOKED" | "NOT_ISSUED";
  readonly studentVerificationStatus: string | null;
}

export interface CheckInResult {
  readonly status: CheckInStatus;
  readonly attendee: CheckInAttendee | null;
  readonly checkedInAt: Date | null;
}

export interface RecentCheckIn {
  readonly name: string;
  readonly registrationReference: string;
  readonly category: "PROFESSIONAL" | "STUDENT";
  readonly checkedInAt: Date;
  readonly method: CheckInMethod;
  readonly staffName: string;
}
