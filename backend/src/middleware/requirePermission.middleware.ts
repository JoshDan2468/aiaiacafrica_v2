/** Enforces the centralized role-permission policy on protected backend routes. */

import type { RequestHandler } from "express";
import { roleHasPermission } from "../config/permissions";
import type { Permission, SafeAdmin } from "../types/admin";
import { createPublicError } from "./error.middleware";

export function requirePermission(permission: Permission): RequestHandler {
  return (_request, response, next) => {
    const admin = response.locals.admin as SafeAdmin | undefined;
    if (!admin || !roleHasPermission(admin.role, permission)) {
      next(createPublicError(403, "Insufficient permissions"));
      return;
    }
    next();
  };
}
