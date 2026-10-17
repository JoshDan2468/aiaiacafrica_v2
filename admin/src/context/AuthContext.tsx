import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/context/authContextValue";
import { adminUnauthorizedEvent } from "@/services/api/client";
import { getCurrentAdmin, loginAdmin, logoutAdmin } from "@/services/auth/authService";
import type { AdminProfile, LoginCredentials } from "@/types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const adminRef = useRef<AdminProfile | null>(null);
  const authVersionRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const setCurrentAdmin = useCallback((value: AdminProfile | null) => {
    adminRef.current = value;
    setAdmin(value);
  }, []);

  const broadcastSessionEnd = useCallback((reason: "EXPIRED" | "LOGOUT") => {
    try {
      localStorage.setItem("aiaiac:admin-session-end", `${reason}:${Date.now()}`);
    } catch {
      // Cross-tab notification is best effort; backend session checks remain authoritative.
    }
  }, []);

  useEffect(() => {
    const endSession = (reason: "EXPIRED" | "LOGOUT", broadcast: boolean) => {
      authVersionRef.current += 1;
      setCurrentAdmin(null);
      setSessionExpired(reason === "EXPIRED");
      if (broadcast) broadcastSessionEnd(reason);
      navigate("/admin/login", { replace: true });
    };
    const onUnauthorized = () => {
      if (adminRef.current) endSession("EXPIRED", true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "aiaiac:admin-session-end") return;
      endSession(event.newValue?.startsWith("EXPIRED:") ? "EXPIRED" : "LOGOUT", false);
    };
    window.addEventListener(adminUnauthorizedEvent, onUnauthorized);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(adminUnauthorizedEvent, onUnauthorized);
      window.removeEventListener("storage", onStorage);
    };
  }, [broadcastSessionEnd, navigate, setCurrentAdmin]);

  const refreshCurrentAdmin = useCallback(async () => {
    const version = authVersionRef.current;
    setIsLoading(true);
    const currentAdmin = await getCurrentAdmin();
    if (authVersionRef.current === version) setCurrentAdmin(currentAdmin);
    setIsLoading(false);
  }, [setCurrentAdmin]);

  useEffect(() => {
    void refreshCurrentAdmin();
  }, [refreshCurrentAdmin]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await loginAdmin(credentials);
      if (result.ok && result.admin) {
        setSessionExpired(false);
        setCurrentAdmin(result.admin);
      }
      return { ok: result.ok, ...(result.message ? { message: result.message } : {}) };
    },
    [setCurrentAdmin],
  );

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      authVersionRef.current += 1;
      setCurrentAdmin(null);
      setSessionExpired(false);
      broadcastSessionEnd("LOGOUT");
    }
  }, [broadcastSessionEnd, setCurrentAdmin]);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isAuthenticated: admin !== null,
      isLoading,
      sessionExpired,
      login,
      logout,
      refreshCurrentAdmin,
    }),
    [admin, isLoading, sessionExpired, login, logout, refreshCurrentAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
