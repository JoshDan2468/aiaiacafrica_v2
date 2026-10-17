import { createContext } from "react";
import type { AdminProfile, AuthActionResult, LoginCredentials } from "@/types/auth";

export interface AuthContextValue {
  admin: AdminProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refreshCurrentAdmin: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
