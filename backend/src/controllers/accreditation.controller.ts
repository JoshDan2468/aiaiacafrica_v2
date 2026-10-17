import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import {
  AccreditationConflictError,
  AccreditationNotFoundError,
  AccreditationSourceError,
  AccreditationTransitionError,
  type AccreditationService,
} from "../services/accreditation.service";
import type { SafeAdmin } from "../types/admin";
import {
  accreditationCreateSchema,
  accreditationIdParamsSchema,
  accreditationListSchema,
  accreditationStatusSchema,
} from "../validators/accreditation.validator";

export function createAccreditationController(service: AccreditationService) {
  const handleError = (error: unknown, next: Parameters<RequestHandler>[2]) => {
    if (error instanceof AccreditationNotFoundError)
      return next(createPublicError(404, "Accreditation not found"));
    if (error instanceof AccreditationSourceError)
      return next(
        createPublicError(
          400,
          "Event or application is not available for accreditation",
        ),
      );
    if (error instanceof AccreditationConflictError)
      return next(
        createPublicError(
          409,
          "This person already has an accreditation for this event/category",
        ),
      );
    if (error instanceof AccreditationTransitionError)
      return next(
        createPublicError(409, "This accreditation status cannot be changed"),
      );
    return next(error);
  };
  const events: RequestHandler = async (_request, response, next) => {
    try {
      response
        .status(200)
        .json({ success: true, data: { events: await service.events() } });
    } catch (error) {
      next(error);
    }
  };
  const list: RequestHandler = async (request, response, next) => {
    const parsed = accreditationListSchema.safeParse(request.query);
    if (!parsed.success)
      return next(createPublicError(400, "Invalid accreditation filters"));
    try {
      response.status(200).json({
        success: true,
        data: await service.list(parsed.data),
      });
    } catch (error) {
      next(error);
    }
  };
  const detail: RequestHandler = async (request, response, next) => {
    const parsed = accreditationIdParamsSchema.safeParse(request.params);
    if (!parsed.success)
      return next(createPublicError(400, "Invalid accreditation ID"));
    try {
      response.status(200).json({
        success: true,
        data: { accreditation: await service.get(parsed.data.id) },
      });
    } catch (error) {
      handleError(error, next);
    }
  };
  const create: RequestHandler = async (request, response, next) => {
    const parsed = accreditationCreateSchema.safeParse(request.body);
    if (!parsed.success)
      return next(createPublicError(400, "Invalid accreditation request"));
    try {
      const actor = response.locals.admin as SafeAdmin;
      response.status(201).json({
        success: true,
        data: { accreditation: await service.create(actor, parsed.data) },
      });
    } catch (error) {
      handleError(error, next);
    }
  };
  const updateStatus: RequestHandler = async (request, response, next) => {
    const params = accreditationIdParamsSchema.safeParse(request.params);
    const body = accreditationStatusSchema.safeParse(request.body);
    if (!params.success || !body.success)
      return next(
        createPublicError(400, "Invalid accreditation status request"),
      );
    try {
      const actor = response.locals.admin as SafeAdmin;
      response.status(200).json({
        success: true,
        data: {
          accreditation: await service.updateStatus(
            actor,
            params.data.id,
            body.data.status,
          ),
        },
      });
    } catch (error) {
      handleError(error, next);
    }
  };
  return { events, list, detail, create, updateStatus };
}
