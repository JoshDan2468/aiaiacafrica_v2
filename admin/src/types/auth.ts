export type AdminRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "FINANCE"
  | "REGISTRATION_MANAGER"
  | "COMMUNICATIONS"
  | "CHECK_IN_STAFF"
  | "ABSTRACT_VIEWER";

export type Permission =
  | "users.read"
  | "users.invite"
  | "users.manage"
  | "delegates.read"
  | "delegates.manage"
  | "registrations.read"
  | "registrations.manage"
  | "check_in.read"
  | "check_in.manage"
  | "accreditations.read"
  | "accreditations.manage"
  | "payments.read"
  | "payments.manage"
  | "student_verifications.read"
  | "student_verifications.review"
  | "sponsors.read"
  | "sponsors.manage"
  | "exhibitors.read"
  | "exhibitors.manage"
  | "abstracts.read"
  | "abstracts.review"
  | "enquiries.read"
  | "enquiries.manage"
  | "communications.read"
  | "communications.create"
  | "communications.send"
  | "communications.manage"
  | "reports.read"
  | "reports.export"
  | "reports.financial"
  | "audit.read"
  | "settings.manage";

export interface AdminProfile {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
}

export interface AuthAdminResponse {
  success: true;
  message: string;
  data: {
    admin: AdminProfile;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthActionResult {
  ok: boolean;
  message?: string;
}
