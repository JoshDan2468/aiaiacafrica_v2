import { Router, type RequestHandler } from "express";

type Controller = ReturnType<
  typeof import("../controllers/registrationRecovery.controller").createRegistrationRecoveryController
>;

export function createRegistrationRecoveryRouter(options: {
  controller: Controller;
  rateLimiter: RequestHandler;
}): Router {
  const router = Router();
  router.post(
    "/delegate-registration-recovery/request",
    options.rateLimiter,
    options.controller.requestRecovery,
  );
  router.post(
    "/delegate-registration-recovery/exchange",
    options.rateLimiter,
    options.controller.exchangeRecovery,
  );
  router.post(
    "/delegate-registration-recovery/workspace",
    options.rateLimiter,
    options.controller.getWorkspace,
  );
  router.post(
    "/delegate-registration-recovery/resend-verification",
    options.rateLimiter,
    options.controller.resendVerification,
  );
  router.post(
    "/delegate-registration-recovery/payment/retry",
    options.rateLimiter,
    options.controller.retryPayment,
  );
  router.post(
    "/delegate-registration-recovery/payment/check",
    options.rateLimiter,
    options.controller.checkPayment,
  );
  return router;
}
