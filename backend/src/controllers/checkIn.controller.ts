import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import type { CheckInService } from "../services/checkIn.service";
import type { SafeAdmin } from "../types/admin";
import {
  confirmCheckInSchema,
  lookupCheckInSchema,
  recentCheckInSchema,
  validateCheckInSchema,
} from "../validators/checkIn.validator";

export function createCheckInController(service: CheckInService) {
  const adminId = (response: Parameters<RequestHandler>[1]) =>
    (response.locals.admin as SafeAdmin).id;

  const validate: RequestHandler = async (request, response, next) => {
    try {
      const parsed = validateCheckInSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid Event Pass request"));
        return;
      }
      const data = await service.validate(
        parsed.data.credential,
        adminId(response),
      );
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
  const lookup: RequestHandler = async (request, response, next) => {
    try {
      const parsed = lookupCheckInSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Enter a registration reference or email"));
        return;
      }
      const data = await service.lookup(parsed.data.query, adminId(response));
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
  const confirm: RequestHandler = async (request, response, next) => {
    try {
      const parsed = confirmCheckInSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid check-in confirmation"));
        return;
      }
      const data = await service.confirm(parsed.data, adminId(response));
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
  const recent: RequestHandler = async (request, response, next) => {
    try {
      const parsed = recentCheckInSchema.safeParse(request.query);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid recent check-in limit"));
        return;
      }
      response.setHeader("Cache-Control", "no-store");
      response
        .status(200)
        .json({ success: true, data: await service.recent(parsed.data.limit) });
    } catch (error) {
      next(error);
    }
  };
  const count: RequestHandler = async (_request, response, next) => {
    try {
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({ success: true, data: await service.count() });
    } catch (error) {
      next(error);
    }
  };
  return { validate, lookup, confirm, recent, count };
}
