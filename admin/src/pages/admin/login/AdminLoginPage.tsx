import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLoadingScreen } from "@/components/admin/AuthLoadingScreen";
import { useAuth } from "@/hooks/useAuth";
import { BrandingSection } from "./BrandingSection";
import { LoginFormSection } from "./LoginFormSection";
import { SEO } from "@/components/common/SEO";
import { applyAdminTheme, getInitialAdminTheme } from "@/components/admin/adminTheme";

interface LoginLocationState {
  from?: {
    pathname?: string;
    search?: string;
  };
}

function getSafeDestination(state: unknown): string {
  const candidate = (state as LoginLocationState | null)?.from;
  if (candidate?.pathname === "/admin/dashboard") {
    return `${candidate.pathname}${candidate.search ?? ""}`;
  }
  return "/admin/dashboard";
}

export function AdminLoginPage() {
  const { isAuthenticated, isLoading, sessionExpired, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const destination = getSafeDestination(location.state);

  useEffect(() => {
    applyAdminTheme(getInitialAdminTheme(), false);
  }, []);

  if (isLoading) return <AuthLoadingScreen />;
  if (isAuthenticated) return <Navigate to={destination} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Enter your email address and password.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const result = await login({ email: normalizedEmail, password });
    setIsSubmitting(false);

    if (!result.ok) {
      setPassword("");
      setError(result.message ?? "Unable to sign in. Please try again.");
      return;
    }

    navigate(destination, { replace: true });
  };

  return (
    <main className="admin-auth admin-auth__page">
      <SEO title="Admin Sign In | AIAIAC Africa 2027" noindex={true} />
      <div className="admin-auth__shell">
        <LoginFormSection
          email={email}
          password={password}
          showPassword={showPassword}
          error={error || (sessionExpired ? "Your session expired. Please sign in again." : "")}
          isSubmitting={isSubmitting}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((visible) => !visible)}
          onSubmit={(event) => void handleSubmit(event)}
        />
        <BrandingSection />
      </div>
    </main>
  );
}
