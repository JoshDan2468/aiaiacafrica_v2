import type { RequestHandler } from "express";
import { authCookieName, getAuthCookieSecurity } from "../config/session";
import {
  getAdminSessionDeadlines,
  type AdminSessionPolicy,
} from "../config/adminSessionPolicy";
import { createPublicError } from "../middleware/error.middleware";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";
import type { AuthService } from "../services/auth.service";
import { loginSchema } from "../validators/auth.validator";

interface AuthControllerOptions {
  readonly authService: AuthService;
  readonly audits: AdminAuditRepository;
  readonly sessionPolicy: AdminSessionPolicy;
  readonly production: boolean;
}

function regenerateSession(
  request: Parameters<RequestHandler>[0],
): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(request: Parameters<RequestHandler>[0]): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(request: Parameters<RequestHandler>[0]): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

export function createAuthController(options: AuthControllerOptions) {
  const login: RequestHandler = async (request, response, next) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid login request"));
        return;
      }

      const admin = await options.authService.authenticate(
        parsed.data.email,
        parsed.data.password,
      );
      if (!admin) {
        next(createPublicError(401, "Invalid email or password"));
        return;
      }

      await regenerateSession(request);
      const now = (options.sessionPolicy.now ?? Date.now)();
      request.session.adminId = admin.id;
      request.session.adminSessionCreatedAt = now;
      request.session.adminLastActivityAt = now;
      request.session.cookie.maxAge = options.sessionPolicy.absoluteMs;
      await saveSession(request);
      try {
        await options.audits.create({
          adminId: admin.id,
          action: "ADMIN_LOGIN",
          entityType: "ADMIN_USER",
          entityId: admin.id,
        });
      } catch {
        // Authentication remains usable if the independent audit write fails.
      }

      response.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          admin,
          ...getAdminSessionDeadlines(request.session, options.sessionPolicy),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  const me: RequestHandler = (request, response) => {
    response.status(200).json({
      success: true,
      message: "Current admin retrieved",
      data: {
        admin: response.locals.admin,
        ...getAdminSessionDeadlines(request.session, options.sessionPolicy),
      },
    });
  };

  const logout: RequestHandler = async (request, response, next) => {
    try {
      if (request.session.adminId) {
        try {
          await options.audits.create({
            adminId: request.session.adminId,
            action: "ADMIN_LOGOUT",
            entityType: "ADMIN_USER",
            entityId: request.session.adminId,
          });
        } catch {
          // Revocation must proceed even when audit persistence fails.
        }
      }
      await destroySession(request);
      response.clearCookie(authCookieName, {
        httpOnly: true,
        ...getAuthCookieSecurity(options.production),
        path: "/",
      });
      response.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  };

  return { login, me, logout };
}
