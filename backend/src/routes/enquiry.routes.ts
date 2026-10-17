import { Router, type RequestHandler } from "express";

type EnquiryController = ReturnType<
  typeof import("../controllers/enquiry.controller").createEnquiryController
>;

export function createEnquiryRouter(options: {
  readonly controller: EnquiryController;
  readonly rateLimiter: RequestHandler;
}): Router {
  const router = Router();
  router.post("/enquiries", options.rateLimiter, options.controller.create);
  return router;
}
