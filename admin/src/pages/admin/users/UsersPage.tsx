import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, UserPlus, Users } from "@/components/admin/adminIcons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableErrorState,
  AdminTableHeader,
  AdminTableHeaderCell,
  AdminTableLoadingState,
  AdminTableRow,
} from "@/components/admin/AdminTable";
import { InviteUserModal } from "@/components/admin/InviteUserModal";
import { useAuth } from "@/hooks/useAuth";
import { formatAdminRole, getAdminInitials } from "@/lib/adminProfile";
import {
  getAdminUsers,
  promoteAdminToSuperAdmin,
  updateAdminRole,
  updateAdminStatus,
} from "@/services/admin/adminUserService";
import type { AdminUser, AssignableAdminRole } from "@/types/adminUsers";

const assignableRoles: AssignableAdminRole[] = [
  "ADMIN",
  "FINANCE",
  "REGISTRATION_MANAGER",
  "COMMUNICATIONS",
  "CHECK_IN_STAFF",
  "ABSTRACT_VIEWER",
];

export function UsersPage() {
  const { admin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [promotionTarget, setPromotionTarget] = useState<AdminUser | null>(null);
  const [promotionConfirmed, setPromotionConfirmed] = useState(false);

  const canInvite = Boolean(admin?.permissions.includes("users.invite"));
  const canManage = Boolean(admin?.permissions.includes("users.manage"));

  const load = useCallback(async () => {
    setState("loading");
    const result = await getAdminUsers();
    if (!result.ok) {
      setState("error");
      return;
    }
    setUsers(result.users);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (user: AdminUser, role: AssignableAdminRole) => {
    setBusyId(user.id);
    setMessage("");
    const result = await updateAdminRole(user.id, role);
    setBusyId(null);
    if (!result.ok) {
      setMessage(result.error ?? "The role could not be changed.");
      return;
    }
    setMessage(`Updated role for ${user.fullName} to ${formatAdminRole(role)}.`);
    await load();
  };

  const toggleStatus = async (user: AdminUser) => {
    setBusyId(user.id);
    setMessage("");
    const nextStatus = !user.isActive;
    const result = await updateAdminStatus(user.id, nextStatus);
    setBusyId(null);
    if (!result.ok) {
      setMessage(result.error ?? "The status could not be changed.");
      return;
    }
    setMessage(`${user.fullName} has been ${nextStatus ? "activated" : "deactivated"}.`);
    await load();
  };

  const promote = async () => {
    if (!promotionTarget || !promotionConfirmed || admin?.role !== "SUPER_ADMIN") return;
    const target = promotionTarget;
    setBusyId(target.id);
    setMessage("");
    const result = await promoteAdminToSuperAdmin(target.id);
    setBusyId(null);
    setPromotionTarget(null);
    setPromotionConfirmed(false);
    if (!result.ok) {
      setMessage(result.error ?? "The account could not be promoted.");
      return;
    }
    setMessage(`${target.fullName} was promoted to Super Admin.`);
    await load();
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Administration / Access Control"
        title="Users & Roles"
        description="Manage administrator permissions and staff account status."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/users/invitations"
              className="inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
            >
              <Users className="size-3.5" />
              <span>Invitation History</span>
            </Link>
            {canInvite && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-md bg-[#05190F] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#05190F]/90"
              >
                <UserPlus className="size-3.5" />
                <span>Invite Staff</span>
              </button>
            )}
          </div>
        }
      />

      {message && (
        <div
          className="rounded-md border border-slate-200 bg-slate-100 p-3 text-xs font-medium text-slate-800"
          role="status"
        >
          {message}
        </div>
      )}

      {state === "loading" ? (
        <AdminTableLoadingState message="Loading staff users…" />
      ) : state === "error" ? (
        <AdminTableErrorState
          message="We could not load staff users."
          onRetry={() => void load()}
        />
      ) : (
        <AdminTable>
          <AdminTableHeader>
            <tr>
              <AdminTableHeaderCell>Staff Member</AdminTableHeaderCell>
              <AdminTableHeaderCell>Role &amp; Permissions</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Date Joined</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHeader>
          <AdminTableBody>
            {users.map((user) => {
              const protectedUser = user.role === "SUPER_ADMIN" || user.id === admin?.id;
              const initials = getAdminInitials(user.fullName);
              return (
                <AdminTableRow key={user.id}>
                  <AdminTableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#05190F] text-xs font-bold text-white shadow-xs">
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{user.fullName}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    {protectedUser || !canManage ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Shield className="size-3 text-emerald-600" />
                        {formatAdminRole(user.role)}
                      </div>
                    ) : (
                      <select
                        aria-label={`Role for ${user.fullName}`}
                        className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 shadow-2xs outline-none focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
                        disabled={busyId === user.id}
                        value={user.role}
                        onChange={(event) =>
                          void changeRole(user, event.target.value as AssignableAdminRole)
                        }
                      >
                        {assignableRoles.map((role) => (
                          <option value={role} key={role}>
                            {formatAdminRole(role)}
                          </option>
                        ))}
                      </select>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusBadge status={user.isActive ? "ACTIVE" : "DISABLED"} />
                  </AdminTableCell>
                  <AdminTableCell className="text-xs font-medium text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </AdminTableCell>
                  <AdminTableCell className="text-right">
                    {!protectedUser && canManage && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {admin?.role === "SUPER_ADMIN" && user.isActive && (
                          <button
                            type="button"
                            disabled={busyId === user.id}
                            onClick={() => {
                              setPromotionTarget(user);
                              setPromotionConfirmed(false);
                            }}
                            className="inline-flex min-h-9 sm:min-h-8 items-center rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Promote to Super Admin
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === user.id}
                          onClick={() => void toggleStatus(user)}
                          className={`inline-flex min-h-9 sm:min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            user.isActive
                              ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          } disabled:opacity-50`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    )}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      )}

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => void load()}
        canInviteSuperAdmin={admin?.role === "SUPER_ADMIN"}
      />
      {promotionTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promotion-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="promotion-title" className="text-lg font-bold text-slate-900">
              Promote to Super Admin?
            </h2>
            <p className="mt-3 text-sm text-slate-700">
              This grants <strong>full platform control</strong> to {promotionTarget.fullName} (
              {promotionTarget.email}). Their existing account and sign-in credentials remain the
              same.
            </p>
            <label className="mt-5 flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={promotionConfirmed}
                onChange={(event) => setPromotionConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>I understand this account will have full platform control.</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPromotionTarget(null)}
                disabled={busyId === promotionTarget.id}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void promote()}
                disabled={!promotionConfirmed || busyId === promotionTarget.id}
                className="rounded-md bg-[#05190F] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirm promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
