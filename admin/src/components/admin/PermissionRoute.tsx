import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAdminHomePath } from "@/data/adminNavigation";
import { useAuth } from "@/hooks/useAuth";
import type { Permission } from "@/types/auth";

/** UX guard only; every corresponding API remains permission-protected by Express. */
export function PermissionRoute({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { admin } = useAuth();
  return admin?.permissions.includes(permission) ? (
    children
  ) : (
    <Navigate to={getAdminHomePath(admin?.permissions ?? [])} replace />
  );
}
