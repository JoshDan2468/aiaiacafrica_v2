import type { AdminRole } from "./admin";

export type EventPassStatus = "ACTIVE" | "REVOKED";
export type DeliveryStatus = "NOT_QUEUED" | "PENDING" | "SENT" | "FAILED";

export interface EventPassRecord {
  readonly id: string;
  readonly registrationId: string;
  readonly status: EventPassStatus;
  readonly issuedAt: Date;
  readonly checkedInAt: Date | null;
}

export interface DelegateConfirmationClaim {
  readonly shouldSend: boolean;
  readonly eventPass: EventPassRecord;
}

export interface AdminNotificationClaim {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
}

export type PaymentNotificationRole = Extract<
  AdminRole,
  "SUPER_ADMIN" | "FINANCE"
>;
