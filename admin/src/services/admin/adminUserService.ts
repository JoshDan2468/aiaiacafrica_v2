import { apiRequest } from "@/services/api/client";
import type { AdminProfile } from "@/types/auth";
import type {
  AdminInvitation,
  AdminUser,
  AssignableAdminRole,
  CreateInvitationPayload,
  InvitationValidation,
} from "@/types/adminUsers";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getAdminUsers() {
  const result = await apiRequest<ApiEnvelope<{ users: AdminUser[] }>>("/admin/users");
  return result.ok && result.data
    ? { ok: true as const, users: result.data.data.users }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function updateAdminStatus(id: string, isActive: boolean) {
  return apiRequest<ApiEnvelope<{ user: AdminUser }>>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  });
}

export async function updateAdminRole(id: string, role: AssignableAdminRole) {
  return apiRequest<ApiEnvelope<{ user: AdminUser }>>(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
}

export async function promoteAdminToSuperAdmin(id: string) {
  return apiRequest<ApiEnvelope<{ user: AdminUser }>>(`/admin/users/${id}/promote`, {
    method: "PATCH",
  });
}

export async function getAdminInvitations() {
  const result = await apiRequest<ApiEnvelope<{ invitations: AdminInvitation[] }>>(
    "/admin/users/invitations",
  );
  return result.ok && result.data
    ? { ok: true as const, invitations: result.data.data.invitations }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function createAdminInvitation(payload: CreateInvitationPayload) {
  return apiRequest<ApiEnvelope<{ invitation: AdminInvitation; emailSent: boolean }>>(
    "/admin/users/invitations",
    { method: "POST", body: payload },
  );
}

export async function revokeAdminInvitation(id: string) {
  return apiRequest<ApiEnvelope<{ invitation: AdminInvitation }>>(
    `/admin/users/invitations/${id}/revoke`,
    { method: "POST" },
  );
}

export async function resendAdminInvitation(id: string) {
  return apiRequest<ApiEnvelope<{ invitation: AdminInvitation; emailSent: boolean }>>(
    `/admin/users/invitations/${id}/resend`,
    { method: "POST" },
  );
}

export async function validateAdminInvitation(token: string) {
  return apiRequest<ApiEnvelope<InvitationValidation>>(
    `/admin/invitations/validate?token=${encodeURIComponent(token)}`,
  );
}

export async function acceptAdminInvitation(
  token: string,
  password: string,
  confirmPassword: string,
) {
  return apiRequest<ApiEnvelope<{ admin: AdminProfile }>>("/admin/invitations/accept", {
    method: "POST",
    body: { token, password, confirmPassword },
  });
}
