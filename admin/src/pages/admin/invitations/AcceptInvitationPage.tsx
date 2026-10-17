import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, UserCheck } from "@/components/admin/adminIcons";
import { applyAdminTheme, getInitialAdminTheme } from "@/components/admin/adminTheme";
import { SEO } from "@/components/common/SEO";
import { formatAdminRole } from "@/lib/adminProfile";
import { acceptAdminInvitation, validateAdminInvitation } from "@/services/admin/adminUserService";
import type { InvitationValidation, PublicAdminInvitation } from "@/types/adminUsers";

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"loading" | "valid" | "invalid">("loading");
  const [status, setStatus] = useState<InvitationValidation["status"]>("INVALID");
  const [invitation, setInvitation] = useState<PublicAdminInvitation | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    applyAdminTheme(getInitialAdminTheme(), false);
  }, []);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    void validateAdminInvitation(token).then((result) => {
      if (!result.ok || !result.data) {
        setState("invalid");
        return;
      }
      const validation = result.data.data;
      setStatus(validation.status);
      if (validation.status === "VALID") {
        setInvitation(validation.invitation);
        setState("valid");
      } else {
        setState("invalid");
      }
    });
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await acceptAdminInvitation(token, password, confirmPassword);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "The invitation could not be accepted.");
      return;
    }
    navigate("/admin/login?activated=1", { replace: true });
  };

  return (
    <main className="admin-auth flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 font-sans text-slate-900 antialiased">
      <SEO title="Activate Staff Account | AIAIAC Africa 2027" noindex={true} />
      <section
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(20,30,24,0.12)] sm:p-10"
        aria-labelledby="accept-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <span className="admin-auth__logo-frame">
            <img
              src="/brand/aiaiac-logo-dark.png"
              alt="AIAIAC 2027"
              className="admin-auth__logo admin-auth__logo--light"
            />
            <img
              src="/brand/aiaiac-logo-light.png"
              alt=""
              aria-hidden="true"
              className="admin-auth__logo admin-auth__logo--dark"
            />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <ShieldCheck className="size-3 text-emerald-600" /> Verified Invitation
          </span>
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Staff Account Activation
        </p>
        <h1
          id="accept-title"
          className="mt-1 font-sans text-2xl font-bold tracking-tight text-slate-900"
        >
          Accept Admin Invitation
        </h1>

        {state === "loading" ? (
          <div
            className="mt-8 flex flex-col items-center justify-center py-8 text-center"
            role="status"
          >
            <p className="text-sm font-medium text-slate-600">Verifying secure invitation link…</p>
          </div>
        ) : state === "invalid" ? (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-5" role="alert">
            <p className="font-bold text-rose-900">Invalid or Expired Invitation</p>
            <p className="mt-1 text-xs text-rose-700">
              Invitation status: <span className="font-bold">{status}</span>. Please request a new
              invitation link from a Super Admin.
            </p>
            <Link
              to="/admin/login"
              className="mt-4 inline-block text-xs font-semibold text-[#05190F] dark:text-[#CFEA3B] underline"
            >
              Return to Admin Login
            </Link>
          </div>
        ) : invitation ? (
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-[#05190F] shadow-2xs">
                  <UserCheck className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{invitation.fullName}</p>
                  <p className="text-xs text-slate-500">{invitation.email}</p>
                  <div className="mt-2 inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    Role: {formatAdminRole(invitation.role)}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition-colors focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
                placeholder="Minimum 12 characters"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition-colors focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]"
                placeholder="Re-enter your password"
              />
            </div>
            <p className="text-[11px] leading-normal text-slate-500">
              Password must contain at least 12 characters with uppercase, lowercase, and a number.
            </p>
            {error && (
              <div
                className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
                role="alert"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-md bg-[#05190F] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#05190F]/90 disabled:opacity-50"
            >
              {submitting ? "Activating Account…" : "Set Password & Activate Account"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
