/**
 * Admin permission policy
 *
 * This is the single backend source of truth for role capabilities. Routes
 * enforce these permissions; frontend visibility is only a convenience.
 */

import type { AdminRole, Permission } from "../types/admin";
import { permissions } from "../types/admin";

export const rolePermissions = {
  SUPER_ADMIN: permissions,
  ADMIN: [
    "accreditations.read",
    "accreditations.manage",
    "check_in.read",
    "check_in.manage",
    "delegates.read",
    "delegates.manage",
    "registrations.read",
    "registrations.manage",
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
  ],
  FINANCE: [
    "payments.read",
    "payments.manage",
    "registrations.read",
    "reports.read",
    "reports.export",
    "reports.financial",
  ],
  REGISTRATION_MANAGER: [
    "accreditations.read",
    "accreditations.manage",
    "check_in.read",
    "check_in.manage",
    "delegates.read",
    "delegates.manage",
    "registrations.read",
    "registrations.manage",
    "student_verifications.read",
    "student_verifications.review",
    "sponsors.read",
    "sponsors.manage",
    "exhibitors.read",
    "exhibitors.manage",
    "abstracts.read",
    "enquiries.read",
    "enquiries.manage",
    "reports.read",
    "reports.export",
  ],
  COMMUNICATIONS: [
    "communications.read",
    "communications.create",
    "communications.send",
    "communications.manage",
    "enquiries.read",
    "enquiries.manage",
    "reports.read",
  ],
  CHECK_IN_STAFF: ["check_in.read", "check_in.manage"],
  ABSTRACT_VIEWER: ["abstracts.read"],
} as const satisfies Record<AdminRole, readonly Permission[]>;

export function getPermissionsForRole(role: AdminRole): readonly Permission[] {
  return rolePermissions[role];
}

export function roleHasPermission(
  role: AdminRole,
  permission: Permission,
): boolean {
  return (rolePermissions[role] as readonly Permission[]).includes(permission);
}
