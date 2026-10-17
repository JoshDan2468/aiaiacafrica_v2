import { Router, type RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";

// Abstract attachments have no approved storage/scanning/reviewer lifecycle yet.
// Reject documents before parsing or persisting them; existing text contracts stay intact.
const requireAbstractTextSubmission: RequestHandler = (
  request,
  _response,
  next,
) => {
  const contentType = request.header("content-type");
  if (
    contentType &&
    !request.is("application/json") &&
    !request.is("application/x-www-form-urlencoded")
  ) {
    next(
      createPublicError(
        415,
        "Abstract document uploads are unavailable. Submit abstract text only.",
      ),
    );
    return;
  }
  next();
};

type AbstractController = ReturnType<
  typeof import("../controllers/abstractSubmission.controller").createAbstractSubmissionController
>;

export function createAbstractSubmissionRouter(options: {
  readonly controller: AbstractController;
  readonly rateLimiter: RequestHandler;
}): Router {
  const router = Router();
  router.post(
    "/abstract-submissions",
    options.rateLimiter,
    requireAbstractTextSubmission,
    options.controller.create,
  );
  router.get(
    "/abstract-submissions/:reference/workspace",
    options.rateLimiter,
    options.controller.authorize,
    options.controller.getWorkspace,
  );
  router.patch(
    "/abstract-submissions/:reference/revision",
    options.rateLimiter,
    options.controller.authorize,
    requireAbstractTextSubmission,
    options.controller.updateRevision,
  );
  router.post(
    "/abstract-submissions/:reference/resubmit",
    options.rateLimiter,
    options.controller.authorize,
    requireAbstractTextSubmission,
    options.controller.resubmit,
  );
  router.post(
    "/abstract-submission-recovery/request",
    options.rateLimiter,
    options.controller.requestRecovery,
  );
  router.post(
    "/abstract-submission-recovery/exchange",
    options.rateLimiter,
    options.controller.exchangeRecovery,
  );
  return router;
}
