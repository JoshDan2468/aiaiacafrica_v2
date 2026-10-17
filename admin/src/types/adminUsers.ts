import type { AdminRole } from "@/types/auth";

export type AssignableAdminRole = Exclude<AdminRole, "SUPER_ADMIN">;
export type InvitationAdminRole = AssignableAdminRole | "SUPER_ADMIN";
export type AdminInvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminInvitation {
  id: string;
  fullName: string;
  email: string;
  role: InvitationAdminRole;
  invitedByAdminId: string;
  status: AdminInvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationPayload {
  name: string;
  email: string;
  role: InvitationAdminRole;
}

export interface PublicAdminInvitation {
  fullName: string;
  email: string;
  role: InvitationAdminRole;
  expiresAt: string;
}

export type InvitationValidation =
  | { status: "INVALID" | "EXPIRED" | "USED" | "REVOKED" }
  | { status: "VALID"; invitation: PublicAdminInvitation };
