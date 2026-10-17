import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  LoaderCircle,
  Mail,
  RotateCw,
  UserMinus,
  UserPlus,
} from "@/components/admin/adminIcons";
import { Link } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyState,
  AdminTableErrorState,
  AdminTableHeader,
  AdminTableHeaderCell,
  AdminTableLoadingState,
  AdminTableRow,
} from "@/components/admin/AdminTable";
import { formatAdminRole } from "@/lib/adminProfile";
import { useAuth } from "@/hooks/useAuth";
import {
  createAdminInvitation,
  getAdminInvitations,
  resendAdminInvitation,
  revokeAdminInvitation,
} from "@/services/admin/adminUserService";
import type { AdminInvitation, AssignableAdminRole, InvitationAdminRole } from "@/types/adminUsers";

const roles: AssignableAdminRole[] = [
  "ADMIN",
  "FINANCE",
  "REGISTRATION_MANAGER",
  "COMMUNICATIONS",
  "CHECK_IN_STAFF",
  "ABSTRACT_VIEWER",
];

const filterInputStyle =
  "mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-normal text-slate-800 shadow-2xs outline-none transition-colors placeholder:text-slate-400 focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]";

export function AdminInvitationsPage() {
  const { admin } = useAuth();
  const canInviteSuperAdmin = admin?.role === "SUPER_ADMIN";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationAdminRole>("ADMIN");
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    const result = await getAdminInvitations();
    if (!result.ok) {
      setState("error");
      return;
    }
    setInvitations(result.invitations);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (role === "SUPER_ADMIN" && !canInviteSuperAdmin) {
      setMessage("Only a Super Admin can invite another Super Admin.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const result = await createAdminInvitation({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
    });
    setSubmitting(false);
    if (!result.ok) {
      setMessage(
        result.status === 502
          ? "The invitation was saved, but email delivery failed. Use Resend below."
          : (result.error ?? "The invitation could not be created."),
      );
      await load();
      return;
    }
    setName("");
    setEmail("");
    setMessage("Invitation created and dispatched via email.");
    await load();
  };

  const executeAction = async (id: string, action: "revoke" | "resend") => {
    setBusyId(id);
    setMessage("");
    const result =
      action === "revoke" ? await revokeAdminInvitation(id) : await resendAdminInvitation(id);
    setBusyId(null);
    setMessage(
      result.ok
        ? action === "revoke"
          ? "Invitation revoked successfully."
          : "Invitation email resent successfully."
        : (result.error ?? "The invitation could not be updated."),
    );
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/users"
          className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" /> Back to Users &amp; Roles
        </Link>
        <AdminPageHeader
          eyebrow="Administration / Invitations"
          title="Staff Invitations"
          description="Track and manage single-use invitation tokens issued to conference personnel."
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-900">
          <UserPlus className="size-4 text-[#05190F]" />
          <span>New Staff Invitation</span>
        </div>
        <form onSubmit={(event) => void submit(event)} className="grid gap-3.5 md:grid-cols-3">
          <div>
            <label htmlFor="invitee-name" className="block text-xs font-medium text-slate-700">
              Full Name *
            </label>
            <input
              id="invitee-name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={filterInputStyle}
            />
          </div>
          <div>
            <label htmlFor="invitee-email" className="block text-xs font-medium text-slate-700">
              Work Email *
            </label>
            <input
              id="invitee-email"
              required
              type="email"
              placeholder="email@aiaiac.org"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={filterInputStyle}
            />
          </div>
          <div>
            <label htmlFor="invitee-role" className="block text-xs font-medium text-slate-700">
              Assigned Role *
            </label>
            <select
              id="invitee-role"
              value={role}
              onChange={(event) => setRole(event.target.value as InvitationAdminRole)}
              aria-describedby={role === "SUPER_ADMIN" ? "invitee-super-admin-warning" : undefined}
              className={filterInputStyle}
            >
              {roles.map((item) => (
                <option value={item} key={item}>
                  {formatAdminRole(item)}
                </option>
              ))}
              {canInviteSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
            </select>
          </div>
          {role === "SUPER_ADMIN" && (
            <p
              id="invitee-super-admin-warning"
              role="alert"
              data-tone="warning"
              className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs font-medium leading-relaxed text-amber-950 md:col-span-3"
            >
              Super Admin grants full platform control. Verify the recipient's official email. They
              will create their own password from a single-use invitation.
            </p>
          )}
          <div className="flex justify-end pt-1 md:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#05190F]/90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <Mail className="size-3.5" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {message && (
        <div
          className="rounded-md border border-slate-200 bg-slate-100 p-3 text-xs font-medium text-slate-800"
          role="status"
        >
          {message}
        </div>
      )}

      {state === "loading" ? (
        <AdminTableLoadingState message="Loading staff invitations…" />
      ) : state === "error" ? (
        <AdminTableErrorState
          message="We could not load invitations."
          onRetry={() => void load()}
        />
      ) : invitations.length === 0 ? (
        <AdminTableEmptyState
          title="No invitations found"
          description="No staff invitations have been issued yet."
        />
      ) : (
        <AdminTable minWidth="min-w-[55rem]">
          <AdminTableHeader>
            <tr>
              <AdminTableHeaderCell>Invitee</AdminTableHeaderCell>
              <AdminTableHeaderCell>Assigned Role</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Issued</AdminTableHeaderCell>
              <AdminTableHeaderCell>Expires</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email Dispatch</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHeader>
          <AdminTableBody>
            {invitations.map((invitation) => (
              <AdminTableRow key={invitation.id}>
                <AdminTableCell>
                  <p className="font-semibold text-slate-900">{invitation.fullName}</p>
                  <p className="text-xs text-slate-500">{invitation.email}</p>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {formatAdminRole(invitation.role)}
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge status={invitation.status} />
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-500">
                  {new Date(invitation.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-500">
                  {new Date(invitation.expiresAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge
                    status={invitation.emailSentAt ? "SENT" : "NOT_SENT"}
                    tone={invitation.emailSentAt ? "success" : "neutral"}
                  />
                </AdminTableCell>
                <AdminTableCell className="text-right">
                  {invitation.status === "PENDING" && (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === invitation.id}
                        onClick={() => void executeAction(invitation.id, "resend")}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50"
                        title="Resend invitation email"
                      >
                        <RotateCw className="size-3" />
                        <span>Resend</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === invitation.id}
                        onClick={() => void executeAction(invitation.id, "revoke")}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                        title="Revoke invitation"
                      >
                        <UserMinus className="size-3" />
                        <span>Revoke</span>
                      </button>
                    </div>
                  )}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </div>
  );
}
