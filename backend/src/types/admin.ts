/**
 * Admin access contracts
 *
 * Central TypeScript vocabulary for staff roles, permissions, invitations,
 * users, and security audit events. Role-to-permission policy lives in config.
 */

export const adminRoles = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE",
  "REGISTRATION_MANAGER",
  "COMMUNICATIONS",
  "CHECK_IN_STAFF",
  "ABSTRACT_VIEWER",
] as const;

export type AdminRole = (typeof adminRoles)[number];

export const permissions = [
  "users.read",
  "users.invite",
  "users.manage",
  "delegates.read",
  "delegates.manage",
  "registrations.read",
  "registrations.manage",
  "check_in.read",
  "check_in.manage",
  "accreditations.read",
  "accreditations.manage",
  "payments.read",
  "payments.manage",
  "student_verifications.read",
  "student_verifications.review",
  "sponsors.read",
  "sponsors.manage",
  "exhibitors.read",
  "exhibitors.manage",
  "abstracts.read",
  "abstracts.review",
  "enquiries.read",
  "enquiries.manage",
  "communications.read",
  "communications.create",
  "communications.send",
  "communications.manage",
  "reports.read",
  "reports.export",
  "reports.financial",
  "audit.read",
  "settings.manage",
] as const;

export type Permission = (typeof permissions)[number];

export interface SafeAdmin {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly permissions: readonly Permission[];
}

export interface AdminRecord {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
}

export interface AdminUser {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly lastLoginAt: Date | null;
}

export const assignableAdminRoles = [
  "ADMIN",
  "FINANCE",
  "REGISTRATION_MANAGER",
  "COMMUNICATIONS",
  "CHECK_IN_STAFF",
  "ABSTRACT_VIEWER",
] as const satisfies readonly AdminRole[];

export type AssignableAdminRole = (typeof assignableAdminRoles)[number];

/** Invitation-only elevation; ordinary user role changes remain non-Super-Admin. */
export type InvitableAdminRole = AssignableAdminRole | "SUPER_ADMIN";

export const adminInvitationStatuses = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;

export type AdminInvitationStatus = (typeof adminInvitationStatuses)[number];

export interface AdminInvitation {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: InvitableAdminRole;
  readonly invitedByAdminId: string;
  readonly status: AdminInvitationStatus;
  readonly expiresAt: Date;
  readonly acceptedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly emailSentAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AdminInvitationRecord extends AdminInvitation {
  readonly tokenHash: string;
}

export const auditActions = [
  "USER_INVITED",
  "INVITATION_RESENT",
  "INVITATION_REVOKED",
  "INVITATION_ACCEPTED",
  "USER_ROLE_CHANGED",
  "USER_DISABLED",
  "USER_ENABLED",
  "ADMIN_LOGIN",
  "ADMIN_LOGOUT",
  "ADMIN_SESSION_EXPIRED",
  "CAMPAIGN_SCHEDULED",
  "CAMPAIGN_CANCELLED",
  "CONTACT_IMPORTED",
  "COMMERCIAL_APPLICATION_IMPORTED",
  "CONTACT_CONSENT_CHANGED",
  "CONTACT_SUPPRESSED",
  "CAMPAIGN_CREATED",
  "CAMPAIGN_UPDATED",
  "CAMPAIGN_TEST_SENT",
  "CAMPAIGN_CONFIRMED",
  "CAMPAIGN_SEND_STARTED",
  "CAMPAIGN_SEND_COMPLETED",
  "CAMPAIGN_RETRIED",
  "MANUAL_PAYMENT_RECORDED",
  "MANUAL_PAYMENT_CONFIRMED",
  "MANUAL_PAYMENT_CONFIRMATION_FAILED",
  "PASS_VALIDATED",
  "CHECK_IN_CONFIRMED",
  "CHECK_IN_ALREADY_COMPLETED",
  "MANUAL_ATTENDEE_LOOKUP",
  "CHECK_IN_DENIED",
  "ACCREDITATION_CREATED",
  "ACCREDITATION_STATUS_CHANGED",
] as const;

export type AuditAction = (typeof auditActions)[number];
