import { Router, type RequestHandler } from "express";

type StudentVerificationController = ReturnType<
  typeof import("../controllers/studentVerification.controller").createStudentVerificationController
>;

export function createStudentVerificationRouter(options: {
  readonly controller: StudentVerificationController;
  readonly rateLimiter: RequestHandler;
  readonly uploadRateLimiter?: RequestHandler;
  readonly workflowRateLimiter?: RequestHandler;
  readonly requestSizeLimit?: RequestHandler;
  readonly multipartParser?: RequestHandler;
}): Router {
  const router = Router();
  router.post(
    "/student-delegate-applications",
    options.rateLimiter,
    options.controller.createApplication,
  );
  if (options.workflowRateLimiter) {
    router.post(
      "/student-verification-recovery/request",
      options.workflowRateLimiter,
      options.controller.requestRecovery,
    );
    router.post(
      "/student-verification-recovery/exchange",
      options.workflowRateLimiter,
      options.controller.exchangeRecovery,
    );
    router.get(
      "/student-delegate-applications/:reference/verification",
      options.controller.authorizeEvidenceAccess,
      options.controller.getVerificationState,
    );
    router.post(
      "/student-delegate-applications/:reference/verification/submit",
      options.workflowRateLimiter,
      options.controller.authorizeEvidenceAccess,
      options.controller.submitForVerification,
    );
  }
  if (
    options.uploadRateLimiter &&
    options.requestSizeLimit &&
    options.multipartParser
  ) {
    router.get(
      "/student-delegate-applications/:reference/evidence",
      options.controller.authorizeEvidenceAccess,
      options.controller.listEvidence,
    );
    router.post(
      "/student-delegate-applications/:reference/evidence",
      options.uploadRateLimiter,
      options.controller.authorizeEvidenceUpload,
      options.requestSizeLimit,
      options.multipartParser,
      options.controller.uploadEvidence,
    );
    router.post(
      "/student-delegate-applications/:reference/evidence/:evidenceId/replace",
      options.uploadRateLimiter,
      options.controller.authorizeEvidenceUpload,
      options.requestSizeLimit,
      options.multipartParser,
      options.controller.replaceEvidence,
    );
  }
  return router;
}
