import { Router, type RequestHandler } from "express";

type EmailVerificationController = ReturnType<
  typeof import("../controllers/emailVerification.controller").createEmailVerificationController
>;

export function createEmailVerificationRouter(options: {
  readonly controller: EmailVerificationController;
  readonly rateLimiter: RequestHandler;
}): Router {
  const router = Router();
  router.post(
    "/email-verification/verify",
    options.rateLimiter,
    options.controller.verify,
  );
  router.post(
    "/email-verification/resend",
    options.rateLimiter,
    options.controller.resend,
  );
  return router;
}
