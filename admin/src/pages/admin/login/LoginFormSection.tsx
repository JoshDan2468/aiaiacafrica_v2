import { Eye, EyeOff, LoaderCircle } from "@/components/admin/adminIcons";
import type { FormEventHandler } from "react";

interface LoginFormSectionProps {
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function LoginFormSection({
  email,
  password,
  showPassword,
  error,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: LoginFormSectionProps) {
  return (
    <section className="admin-auth__form-panel">
      <header className="admin-auth__logo-lockup">
        <span className="admin-auth__logo-frame">
          <img
            src="/brand/aiaiac-logo-dark.png"
            alt="AIAIAC 2027"
            className="admin-auth__logo admin-auth__logo--light"
          />
          <img
            src="/brand/aiaiac-logo-light.png"
            alt=""
            className="admin-auth__logo admin-auth__logo--dark"
          />
        </span>
        <span className="admin-auth__logo-divider" aria-hidden="true" />
        <span className="admin-auth__administration">Administration</span>
      </header>

      <div className="admin-auth__form-stage">
        <div className="admin-auth__form-wrap">
          <h1 aria-label="Admin Gateway">Sign in</h1>
          <p className="admin-auth__intro">Access the AIAIAC administration platform.</p>

          <form className="admin-auth__form" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(error)}
                placeholder="admin@aiaiac.org"
              />
            </div>

            <div>
              <label htmlFor="admin-password">Password</label>
              <div className="admin-auth__password-field">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  onClick={onTogglePassword}
                  disabled={isSubmitting}
                  className="admin-auth__password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="size-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="admin-auth__error">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="admin-auth__submit">
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Verifying Credentials…
                </>
              ) : (
                "Sign In to Workspace"
              )}
            </button>
          </form>

          <p className="admin-auth__support-note">
            Password recovery is restricted. Contact a Super Admin for account support.
          </p>
        </div>
      </div>
    </section>
  );
}
