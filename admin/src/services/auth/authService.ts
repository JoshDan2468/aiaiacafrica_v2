import { apiRequest } from "@/services/api/client";
import type {
  AdminProfile,
  AuthActionResult,
  AuthAdminResponse,
  LoginCredentials,
} from "@/types/auth";

function getLoginError(status: number): string {
  if (status === 400) return "Enter a valid email address and password.";
  if (status === 401) return "Invalid email or password.";
  if (status === 403) return "You do not have permission to access this area.";
  if (status === 429) return "Too many login attempts. Please wait and try again.";
  if (status === 0) return "We could not reach the service. Check your connection and try again.";
  return "The service is temporarily unavailable. Please try again.";
}

export async function loginAdmin(
  credentials: LoginCredentials,
): Promise<AuthActionResult & { admin?: AdminProfile }> {
  const response = await apiRequest<AuthAdminResponse>("/auth/login", {
    method: "POST",
    body: credentials,
  });

  if (!response.ok || !response.data?.data.admin) {
    return { ok: false, message: getLoginError(response.status) };
  }

  return { ok: true, admin: response.data.data.admin };
}

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  const response = await apiRequest<AuthAdminResponse>("/auth/me");
  return response.ok ? (response.data?.data.admin ?? null) : null;
}

export async function logoutAdmin(): Promise<void> {
  await apiRequest("/auth/logout", { method: "POST" });
}
