/** Protected Admin routes and their authentication/permission/security checkpoints. */

import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { requirePermission } from "../middleware/requirePermission.middleware";

type DelegateController = ReturnType<
  typeof import("../controllers/delegate.controller").createDelegateController
>;
type AdminUserController = ReturnType<
  typeof import("../controllers/adminUser.controller").createAdminUserController
>;
type AdminPaymentController = ReturnType<
  typeof import("../controllers/adminPayment.controller").createAdminPaymentController
>;
type AdminOverviewController = ReturnType<
  typeof import("../controllers/adminOverview.controller").createAdminOverviewController
>;
type StudentVerificationController = ReturnType<
  typeof import("../controllers/studentVerification.controller").createStudentVerificationController
>;
type CommercialApplicationController = ReturnType<
  typeof import("../controllers/commercialApplication.controller").createCommercialApplicationController
>;
type AbstractSubmissionController = ReturnType<
  typeof import("../controllers/abstractSubmission.controller").createAbstractSubmissionController
>;
type EnquiryController = ReturnType<
  typeof import("../controllers/enquiry.controller").createEnquiryController
>;
type CheckInController = ReturnType<
  typeof import("../controllers/checkIn.controller").createCheckInController
>;
type AccreditationController = ReturnType<
  typeof import("../controllers/accreditation.controller").createAccreditationController
>;

interface AdminRouterOptions {
  readonly requireAuth: RequestHandler;
  readonly mutationSecurity?: RequestHandler;
  readonly delegateController?: DelegateController;
  readonly adminUserController?: AdminUserController;
  readonly adminPaymentController?: AdminPaymentController;
  readonly adminOverviewController?: AdminOverviewController;
  readonly studentVerificationController?: StudentVerificationController;
  readonly commercialApplicationController?: CommercialApplicationController;
  readonly abstractSubmissionController?: AbstractSubmissionController;
  readonly enquiryController?: EnquiryController;
  readonly checkInController?: CheckInController;
  readonly accreditationController?: AccreditationController;
}

// The legacy positional form keeps small isolated route tests straightforward.
export function createAdminRouter(
  optionsOrAuth: AdminRouterOptions | RequestHandler,
  legacyDelegateController?: DelegateController,
): Router {
  const options: AdminRouterOptions =
    typeof optionsOrAuth === "function"
      ? {
          requireAuth: optionsOrAuth,
          ...(legacyDelegateController
            ? { delegateController: legacyDelegateController }
            : {}),
        }
      : optionsOrAuth;
  const mutationSecurity: RequestHandler =
    options.mutationSecurity ?? ((_request, _response, next) => next());
  const router = Router();

  if (options.checkInController) {
    const controller = options.checkInController;
    router.post(
      "/check-in/validate",
      options.requireAuth,
      mutationSecurity,
      requirePermission("check_in.read"),
      controller.validate,
    );
    router.post(
      "/check-in/lookup",
      options.requireAuth,
      mutationSecurity,
      requirePermission("check_in.read"),
      controller.lookup,
    );
    router.post(
      "/check-in/confirm",
      options.requireAuth,
      mutationSecurity,
      requirePermission("check_in.manage"),
      controller.confirm,
    );
    router.get(
      "/check-in/recent",
      options.requireAuth,
      requirePermission("check_in.read"),
      controller.recent,
    );
    router.get(
      "/check-in/count",
      options.requireAuth,
      requirePermission("check_in.read"),
      controller.count,
    );
  }

  if (options.accreditationController) {
    const controller = options.accreditationController;
    router.get(
      "/accreditations/events",
      options.requireAuth,
      requirePermission("accreditations.read"),
      controller.events,
    );
    router.get(
      "/accreditations",
      options.requireAuth,
      requirePermission("accreditations.read"),
      controller.list,
    );
    router.get(
      "/accreditations/:id",
      options.requireAuth,
      requirePermission("accreditations.read"),
      controller.detail,
    );
    router.post(
      "/accreditations",
      options.requireAuth,
      mutationSecurity,
      requirePermission("accreditations.manage"),
      controller.create,
    );
    router.patch(
      "/accreditations/:id/status",
      options.requireAuth,
      mutationSecurity,
      requirePermission("accreditations.manage"),
      controller.updateStatus,
    );
  }

  router.get(
    "/test",
    options.requireAuth,
    requirePermission("registrations.read"),
    (_request, response) => {
      response.status(200).json({
        success: true,
        message: "Protected admin endpoint accessible",
      });
    },
  );

  router.get(
    "/super-admin-test",
    options.requireAuth,
    requirePermission("users.read"),
    (_request, response) => {
      response
        .status(200)
        .json({ success: true, message: "Super Admin endpoint accessible" });
    },
  );

  if (options.adminOverviewController) {
    router.get(
      "/overview",
      options.requireAuth,
      requirePermission("registrations.read"),
      options.adminOverviewController.getOverview,
    );
  }

  if (options.delegateController) {
    router.get(
      "/delegates",
      options.requireAuth,
      requirePermission("delegates.read"),
      options.delegateController.listAdminRegistrations,
    );
    router.get(
      "/delegates/:id",
      options.requireAuth,
      requirePermission("delegates.read"),
      options.delegateController.getAdminRegistration,
    );
  }

  if (options.studentVerificationController) {
    router.get(
      "/student-verifications",
      options.requireAuth,
      requirePermission("student_verifications.read"),
      options.studentVerificationController.list,
    );
    router.get(
      "/student-verifications/:reference",
      options.requireAuth,
      requirePermission("student_verifications.read"),
      options.studentVerificationController.getAdminDetail,
    );
    router.get(
      "/student-verifications/:reference/evidence/:evidenceId/download",
      options.requireAuth,
      requirePermission("student_verifications.read"),
      options.studentVerificationController.downloadEvidence,
    );
    router.post(
      "/student-verifications/:reference/approve",
      options.requireAuth,
      mutationSecurity,
      requirePermission("student_verifications.review"),
      options.studentVerificationController.approve,
    );
    router.post(
      "/student-verifications/:reference/request-more-information",
      options.requireAuth,
      mutationSecurity,
      requirePermission("student_verifications.review"),
      options.studentVerificationController.requestMoreInformation,
    );
    router.post(
      "/student-verifications/:reference/reject",
      options.requireAuth,
      mutationSecurity,
      requirePermission("student_verifications.review"),
      options.studentVerificationController.reject,
    );
    router.post(
      "/student-verifications/:reference/notifications/retry",
      options.requireAuth,
      mutationSecurity,
      requirePermission("student_verifications.review"),
      options.studentVerificationController.retryNotifications,
    );
  }

  if (options.commercialApplicationController) {
    const controller = options.commercialApplicationController;
    router.post(
      "/sponsor-applications/import-preview",
      options.requireAuth,
      mutationSecurity,
      requirePermission("sponsors.manage"),
      controller.previewSponsorImport,
    );
    router.post(
      "/sponsor-applications/import-approved",
      options.requireAuth,
      mutationSecurity,
      requirePermission("sponsors.manage"),
      controller.importApprovedSponsors,
    );
    router.post(
      "/exhibitor-applications/import-preview",
      options.requireAuth,
      mutationSecurity,
      requirePermission("exhibitors.manage"),
      controller.previewExhibitorImport,
    );
    router.post(
      "/exhibitor-applications/import-approved",
      options.requireAuth,
      mutationSecurity,
      requirePermission("exhibitors.manage"),
      controller.importApprovedExhibitors,
    );
    router.get(
      "/sponsor-applications",
      options.requireAuth,
      requirePermission("sponsors.read"),
      controller.listSponsors,
    );
    router.get(
      "/sponsor-applications/:reference",
      options.requireAuth,
      requirePermission("sponsors.read"),
      controller.getSponsor,
    );
    router.post(
      "/sponsor-applications/:reference/confirm",
      options.requireAuth,
      mutationSecurity,
      requirePermission("sponsors.manage"),
      controller.confirmSponsor,
    );
    router.post(
      "/sponsor-applications/:reference/request-more-information",
      options.requireAuth,
      mutationSecurity,
      requirePermission("sponsors.manage"),
      controller.requestSponsorInformation,
    );
    router.post(
      "/sponsor-applications/:reference/decline",
      options.requireAuth,
      mutationSecurity,
      requirePermission("sponsors.manage"),
      controller.declineSponsor,
    );
    router.post(
      "/sponsor-applications/:reference/notifications/retry",
      options.requireAuth,
      mutationSecurity,
      requirePermission("sponsors.manage"),
      controller.retrySponsorNotifications,
    );
    router.get(
      "/exhibitor-applications",
      options.requireAuth,
      requirePermission("exhibitors.read"),
      controller.listExhibitors,
    );
    router.get(
      "/exhibitor-applications/:reference",
      options.requireAuth,
      requirePermission("exhibitors.read"),
      controller.getExhibitor,
    );
    router.post(
      "/exhibitor-applications/:reference/confirm",
      options.requireAuth,
      mutationSecurity,
      requirePermission("exhibitors.manage"),
      controller.confirmExhibitor,
    );
    router.post(
      "/exhibitor-applications/:reference/request-more-information",
      options.requireAuth,
      mutationSecurity,
      requirePermission("exhibitors.manage"),
      controller.requestExhibitorInformation,
    );
    router.post(
      "/exhibitor-applications/:reference/decline",
      options.requireAuth,
      mutationSecurity,
      requirePermission("exhibitors.manage"),
      controller.declineExhibitor,
    );
    router.post(
      "/exhibitor-applications/:reference/notifications/retry",
      options.requireAuth,
      mutationSecurity,
      requirePermission("exhibitors.manage"),
      controller.retryExhibitorNotifications,
    );
  }

  if (options.abstractSubmissionController) {
    const controller = options.abstractSubmissionController;
    router.post(
      "/abstract-submissions/:reference/analysis/retry",
      options.requireAuth,
      mutationSecurity,
      requirePermission("abstracts.review"),
      rateLimit({ windowMs: 60_000, limit: 6, standardHeaders: "draft-8", legacyHeaders: false }),
      controller.retryAnalysis,
    );
    router.get(
      "/abstract-submissions",
      options.requireAuth,
      requirePermission("abstracts.read"),
      controller.list,
    );
    router.get(
      "/abstract-submissions/:reference",
      options.requireAuth,
      requirePermission("abstracts.read"),
      controller.getAdminDetail,
    );
    router.post(
      "/abstract-submissions/:reference/start-review",
      options.requireAuth,
      mutationSecurity,
      requirePermission("abstracts.review"),
      controller.startReview,
    );
    router.post(
      "/abstract-submissions/:reference/accept",
      options.requireAuth,
      mutationSecurity,
      requirePermission("abstracts.review"),
      controller.accept,
    );
    router.post(
      "/abstract-submissions/:reference/request-revision",
      options.requireAuth,
      mutationSecurity,
      requirePermission("abstracts.review"),
      controller.requestRevision,
    );
    router.post(
      "/abstract-submissions/:reference/reject",
      options.requireAuth,
      mutationSecurity,
      requirePermission("abstracts.review"),
      controller.reject,
    );
    router.post(
      "/abstract-submissions/:reference/notifications/retry",
      options.requireAuth,
      mutationSecurity,
      requirePermission("abstracts.review"),
      controller.retryNotifications,
    );
  }

  if (options.enquiryController) {
    const controller = options.enquiryController;
    router.get(
      "/enquiries",
      options.requireAuth,
      requirePermission("enquiries.read"),
      controller.list,
    );
    router.get(
      "/enquiries/:reference",
      options.requireAuth,
      requirePermission("enquiries.read"),
      controller.detail,
    );
    router.post(
      "/enquiries/:reference/in-progress",
      options.requireAuth,
      mutationSecurity,
      requirePermission("enquiries.manage"),
      controller.markInProgress,
    );
    router.post(
      "/enquiries/:reference/resolve",
      options.requireAuth,
      mutationSecurity,
      requirePermission("enquiries.manage"),
      controller.resolve,
    );
    router.post(
      "/enquiries/:reference/close",
      options.requireAuth,
      mutationSecurity,
      requirePermission("enquiries.manage"),
      controller.close,
    );
    router.post(
      "/enquiries/:reference/notifications/retry",
      options.requireAuth,
      mutationSecurity,
      requirePermission("enquiries.manage"),
      controller.retryNotifications,
    );
  }

  if (options.adminUserController) {
    router.get(
      "/users",
      options.requireAuth,
      requirePermission("users.read"),
      options.adminUserController.listUsers,
    );
    router.get(
      "/users/invitations",
      options.requireAuth,
      requirePermission("users.read"),
      options.adminUserController.listInvitations,
    );
    router.post(
      "/users/invitations",
      options.requireAuth,
      mutationSecurity,
      requirePermission("users.invite"),
      options.adminUserController.createInvitation,
    );
    router.post(
      "/users/invitations/:id/revoke",
      options.requireAuth,
      mutationSecurity,
      requirePermission("users.manage"),
      options.adminUserController.revokeInvitation,
    );
    router.post(
      "/users/invitations/:id/resend",
      options.requireAuth,
      mutationSecurity,
      requirePermission("users.invite"),
      options.adminUserController.resendInvitation,
    );
    router.patch(
      "/users/:id/status",
      options.requireAuth,
      mutationSecurity,
      requirePermission("users.manage"),
      options.adminUserController.updateStatus,
    );
    router.patch(
      "/users/:id/role",
      options.requireAuth,
      mutationSecurity,
      requirePermission("users.manage"),
      options.adminUserController.updateRole,
    );
    router.patch(
      "/users/:id/promote",
      options.requireAuth,
      mutationSecurity,
      requirePermission("users.manage"),
      options.adminUserController.promoteToSuperAdmin,
    );
  }

  if (options.adminPaymentController) {
    router.get(
      "/payments/manual/eligibility/:reference",
      options.requireAuth,
      requirePermission("payments.manage"),
      options.adminPaymentController.inspectManualEligibility,
    );
    router.post(
      "/payments/manual",
      options.requireAuth,
      mutationSecurity,
      requirePermission("payments.manage"),
      options.adminPaymentController.recordManualPayment,
    );
    router.post(
      "/payments/manual/:reference/confirm",
      options.requireAuth,
      mutationSecurity,
      requirePermission("payments.manage"),
      options.adminPaymentController.confirmManualPayment,
    );
    router.post(
      "/payments/reconcile",
      options.requireAuth,
      mutationSecurity,
      requirePermission("payments.manage"),
      options.adminPaymentController.reconcile,
    );
    router.post(
      "/payments/:reference/completion/retry",
      options.requireAuth,
      mutationSecurity,
      requirePermission("payments.manage"),
      options.adminPaymentController.retryCompletion,
    );
    router.get(
      "/payments",
      options.requireAuth,
      requirePermission("payments.read"),
      options.adminPaymentController.listPayments,
    );
    router.get(
      "/payments/:reference",
      options.requireAuth,
      requirePermission("payments.read"),
      options.adminPaymentController.getPayment,
    );
  }

  return router;
}
