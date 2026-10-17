/** Public invitation validation and acceptance HTTP boundary. */

import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import type { AdminInvitationService } from "../services/adminInvitation.service";
import {
  acceptAdminInvitationSchema,
  validateAdminInvitationSchema,
} from "../validators/adminUser.validator";

export function createAdminInvitationController(
  service: AdminInvitationService,
) {
  const validate: RequestHandler = async (request, response, next) => {
    const parsed = validateAdminInvitationSchema.safeParse(request.query);
    if (!parsed.success)
      return next(createPublicError(400, "Invalid invitation token"));
    try {
      response.status(200).json({
        success: true,
        message: "Invitation status retrieved",
        data: await service.validate(parsed.data.token),
      });
    } catch (error) {
      next(error);
    }
  };

  const accept: RequestHandler = async (request, response, next) => {
    const parsed = acceptAdminInvitationSchema.safeParse(request.body);
    if (!parsed.success)
      return next(
        createPublicError(400, "Invalid invitation acceptance request"),
      );
    try {
      const result = await service.accept(parsed.data);
      if (result.status !== "ACCEPTED") {
        const messages = {
          INVALID: "The invitation link is invalid",
          EXPIRED: "The invitation link has expired",
          USED: "The invitation link has already been used",
          REVOKED: "The invitation has been revoked",
          ACCOUNT_EXISTS: "A staff account already exists for this invitation",
        } as const;
        const statusCode = result.status === "EXPIRED" ? 410 : 409;
        return next(createPublicError(statusCode, messages[result.status]));
      }
      response.status(201).json({
        success: true,
        message: "Staff account activated. You can now log in.",
        data: { admin: result.admin },
      });
    } catch (error) {
      next(error);
    }
  };

  return { validate, accept };
}
