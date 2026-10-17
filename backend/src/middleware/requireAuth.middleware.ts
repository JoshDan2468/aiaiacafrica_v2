import type { RequestHandler } from "express";
import { createPublicError } from "./error.middleware";
import type { AuthService } from "../services/auth.service";
import {
  getAdminSessionExpiry,
  refreshAdminSession,
  type AdminSessionPolicy,
} from "../config/adminSessionPolicy";
import { authCookieName, getAuthCookieSecurity } from "../config/session";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";

export function createRequireAuth(
  authService: AuthService,
  policy: AdminSessionPolicy,
  audits: AdminAuditRepository,
  production: boolean,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const adminId = request.session.adminId;
      if (!adminId) {
        next(createPublicError(401, "Authentication required"));
        return;
      }

      const expiry = getAdminSessionExpiry(request.session, policy);
      if (expiry) {
        try {
          await audits.create({
            adminId,
            action: "ADMIN_SESSION_EXPIRED",
            entityType: "ADMIN_USER",
            entityId: adminId,
            metadata: { reason: expiry },
          });
        } catch {
          // Denial is authoritative even when security-audit persistence is unavailable.
        }
        await new Promise<void>((resolve, reject) =>
          request.session.destroy((error) =>
            error ? reject(error) : resolve(),
          ),
        );
        response.clearCookie(authCookieName, {
          httpOnly: true,
          ...getAuthCookieSecurity(production),
          path: "/",
        });
        next(createPublicError(401, "Authentication required"));
        return;
      }

      const admin = await authService.getActiveAdmin(adminId);
      if (!admin) {
        await new Promise<void>((resolve, reject) =>
          request.session.destroy((error) =>
            error ? reject(error) : resolve(),
          ),
        );
        response.clearCookie(authCookieName, {
          httpOnly: true,
          ...getAuthCookieSecurity(production),
          path: "/",
        });
        next(createPublicError(401, "Authentication required"));
        return;
      }

      refreshAdminSession(request.session, policy);
      response.locals.admin = admin;
      next();
    } catch (error) {
      next(error);
    }
  };
}
