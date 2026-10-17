import { Router, type RequestHandler } from "express";

type DelegateController = ReturnType<
  typeof import("../controllers/delegate.controller").createDelegateController
>;

interface DelegateRouterOptions {
  readonly controller: DelegateController;
  readonly registrationRateLimiter: RequestHandler;
}

export function createDelegateRouter(options: DelegateRouterOptions): Router {
  const router = Router();
  router.get("/delegate-packages", options.controller.getPublicPackages);
  router.post(
    "/delegate-registrations",
    options.registrationRateLimiter,
    options.controller.createRegistration,
  );
  return router;
}
