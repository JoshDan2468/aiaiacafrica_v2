import { Router, type RequestHandler } from "express";
import { roleHasPermission } from "../config/permissions";
import { createPublicError } from "../middleware/error.middleware";
import { requirePermission } from "../middleware/requirePermission.middleware";
import type { SafeAdmin, Permission } from "../types/admin";
import { parseReportDomain } from "../validators/report.validator";

type Controller = ReturnType<
  typeof import("../controllers/report.controller").createReportController
>;
const domainPermissions: Record<
  NonNullable<ReturnType<typeof parseReportDomain>>,
  Permission
> = {
  delegates: "delegates.read",
  students: "student_verifications.read",
  payments: "payments.read",
  sponsors: "sponsors.read",
  exhibitors: "exhibitors.read",
  abstracts: "abstracts.read",
  enquiries: "enquiries.read",
};

export function requireReportDomain(): RequestHandler {
  return (request, response, next) => {
    const domain = parseReportDomain(String(request.params["domain"] ?? ""));
    if (!domain) {
      next(createPublicError(404, "Report not found"));
      return;
    }
    const admin = response.locals.admin as SafeAdmin | undefined;
    if (
      !admin ||
      !roleHasPermission(admin.role, domainPermissions[domain]) ||
      (domain === "payments" &&
        !roleHasPermission(admin.role, "reports.financial"))
    ) {
      next(createPublicError(403, "Insufficient permissions"));
      return;
    }
    next();
  };
}

export function createReportRouter(options: {
  readonly requireAuth: RequestHandler;
  readonly mutationSecurity: RequestHandler;
  readonly controller: Controller;
}): Router {
  const router = Router();
  router.get(
    "/summary",
    options.requireAuth,
    requirePermission("reports.financial"),
    options.controller.summary,
  );
  router.get(
    "/:domain",
    options.requireAuth,
    requirePermission("reports.read"),
    requireReportDomain(),
    options.controller.preview,
  );
  router.post(
    "/:domain/export",
    options.requireAuth,
    options.mutationSecurity,
    requirePermission("reports.read"),
    requirePermission("reports.export"),
    requireReportDomain(),
    options.controller.exportCsv,
  );
  return router;
}
