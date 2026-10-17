import { Router, type RequestHandler } from "express";

type CommercialController = ReturnType<
  typeof import("../controllers/commercialApplication.controller").createCommercialApplicationController
>;

export function createCommercialApplicationRouter(options: {
  readonly controller: CommercialController;
  readonly rateLimiter: RequestHandler;
}): Router {
  const router = Router();
  router.post(
    "/sponsor-applications",
    options.rateLimiter,
    options.controller.createSponsor,
  );
  router.post(
    "/exhibitor-applications",
    options.rateLimiter,
    options.controller.createExhibitor,
  );
  return router;
}
