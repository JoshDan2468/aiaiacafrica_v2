/** Public, rate-limited invitation token routes. */

import { Router, type RequestHandler } from "express";

type Controller = ReturnType<
  typeof import("../controllers/adminInvitation.controller").createAdminInvitationController
>;

export function createAdminInvitationRouter(options: {
  readonly controller: Controller;
  readonly validateRateLimiter: RequestHandler;
  readonly acceptRateLimiter: RequestHandler;
}): Router {
  const router = Router();
  router.get(
    "/validate",
    options.validateRateLimiter,
    options.controller.validate,
  );
  router.post("/accept", options.acceptRateLimiter, options.controller.accept);
  return router;
}
