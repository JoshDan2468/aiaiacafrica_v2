/**
 * Admin user-management controller
 *
 * Validates HTTP input, delegates business decisions to services, and returns
 * only safe operational user and invitation fields.
 */

import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import type { AdminInvitationService } from "../services/adminInvitation.service";
import {
  InvitationAccountExistsError,
  InvitationConflictError,
  InvitationEmailDomainError,
  InvitationNotFoundError,
  InvitationStateError,
  InvitationSuperAdminPermissionError,
} from "../services/adminInvitation.service";
import type { AdminUserService } from "../services/adminUser.service";
import {
  AdminUserNotFoundError,
  AdminUserInactiveError,
  AdminUserPromotionPermissionError,
  AdminUserProtectedError,
  AdminUserSelfChangeError,
} from "../services/adminUser.service";
import type { SafeAdmin } from "../types/admin";
import {
  createAdminInvitationSchema,
  invitationIdParamsSchema,
  updateAdminRoleSchema,
  updateAdminStatusSchema,
} from "../validators/adminUser.validator";

export function createAdminUserController(options: {
  readonly invitations: AdminInvitationService;
  readonly users: AdminUserService;
}) {
  const actor = (response: Parameters<RequestHandler>[1]) =>
    response.locals.admin as SafeAdmin;

  const handleError = (error: unknown, next: Parameters<RequestHandler>[2]) => {
    if (error instanceof AdminUserPromotionPermissionError)
      return next(
        createPublicError(
          403,
          "Only a Super Admin can promote a staff account",
        ),
      );
    if (error instanceof AdminUserInactiveError)
      return next(
        createPublicError(409, "Only an active staff account can be promoted"),
      );
    if (error instanceof InvitationSuperAdminPermissionError)
      return next(
        createPublicError(
          403,
          "Only a Super Admin can invite another Super Admin",
        ),
      );
    if (error instanceof InvitationEmailDomainError)
      return next(
        createPublicError(
          400,
          "The email domain is not approved for staff accounts",
        ),
      );
    if (error instanceof InvitationConflictError)
      return next(
        createPublicError(
          409,
          "A pending invitation already exists for this email",
        ),
      );
    if (error instanceof InvitationAccountExistsError)
      return next(
        createPublicError(409, "A staff account already exists for this email"),
      );
    if (
      error instanceof InvitationNotFoundError ||
      error instanceof AdminUserNotFoundError
    )
      return next(createPublicError(404, "Admin record not found"));
    if (error instanceof InvitationStateError)
      return next(
        createPublicError(409, "The invitation is no longer pending"),
      );
    if (error instanceof AdminUserSelfChangeError)
      return next(
        createPublicError(
          409,
          "You cannot apply this change to your own account",
        ),
      );
    if (error instanceof AdminUserProtectedError)
      return next(
        createPublicError(
          409,
          "The protected Super Admin account cannot be changed",
        ),
      );
    return next(error);
  };

  const createInvitation: RequestHandler = async (request, response, next) => {
    const parsed = createAdminInvitationSchema.safeParse(request.body);
    if (!parsed.success)
      return next(createPublicError(400, "Invalid invitation request"));
    try {
      const result = await options.invitations.create(
        actor(response),
        parsed.data,
      );
      response.status(result.emailSent ? 201 : 502).json({
        success: result.emailSent,
        message: result.emailSent
          ? "Staff invitation created and emailed"
          : "Invitation created, but email delivery failed. Use resend to try again.",
        data: result,
      });
    } catch (error) {
      handleError(error, next);
    }
  };

  const listInvitations: RequestHandler = async (_request, response, next) => {
    try {
      response.status(200).json({
        success: true,
        message: "Admin invitations retrieved",
        data: { invitations: await options.invitations.list() },
      });
    } catch (error) {
      next(error);
    }
  };

  const invitationAction =
    (action: "revoke" | "resend"): RequestHandler =>
    async (request, response, next) => {
      const parsed = invitationIdParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return next(createPublicError(400, "Invalid invitation ID"));
      try {
        if (action === "revoke") {
          const invitation = await options.invitations.revoke(
            actor(response),
            parsed.data.id,
          );
          response.status(200).json({
            success: true,
            message: "Invitation revoked",
            data: { invitation },
          });
          return;
        }
        const result = await options.invitations.resend(
          actor(response),
          parsed.data.id,
        );
        response.status(result.emailSent ? 200 : 502).json({
          success: result.emailSent,
          message: result.emailSent
            ? "Invitation email resent"
            : "Invitation token replaced, but email delivery failed. You can retry resend.",
          data: result,
        });
      } catch (error) {
        handleError(error, next);
      }
    };

  const listUsers: RequestHandler = async (_request, response, next) => {
    try {
      response.status(200).json({
        success: true,
        message: "Admin users retrieved",
        data: { users: await options.users.list() },
      });
    } catch (error) {
      next(error);
    }
  };

  const updateStatus: RequestHandler = async (request, response, next) => {
    const params = invitationIdParamsSchema.safeParse(request.params);
    const body = updateAdminStatusSchema.safeParse(request.body);
    if (!params.success || !body.success)
      return next(createPublicError(400, "Invalid user status request"));
    try {
      const user = await options.users.updateStatus(
        actor(response),
        params.data.id,
        body.data.isActive,
      );
      response.status(200).json({
        success: true,
        message: "User status updated",
        data: { user },
      });
    } catch (error) {
      handleError(error, next);
    }
  };

  const updateRole: RequestHandler = async (request, response, next) => {
    const params = invitationIdParamsSchema.safeParse(request.params);
    const body = updateAdminRoleSchema.safeParse(request.body);
    if (!params.success || !body.success)
      return next(createPublicError(400, "Invalid user role request"));
    try {
      const user = await options.users.updateRole(
        actor(response),
        params.data.id,
        body.data.role,
      );
      response
        .status(200)
        .json({ success: true, message: "User role updated", data: { user } });
    } catch (error) {
      handleError(error, next);
    }
  };

  const promoteToSuperAdmin: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    const params = invitationIdParamsSchema.safeParse(request.params);
    if (!params.success || Object.keys(request.body ?? {}).length !== 0)
      return next(createPublicError(400, "Invalid promotion request"));
    try {
      const user = await options.users.promoteToSuperAdmin(
        actor(response),
        params.data.id,
      );
      response.status(200).json({
        success: true,
        message: "Staff account promoted to Super Admin",
        data: { user },
      });
    } catch (error) {
      handleError(error, next);
    }
  };

  return {
    createInvitation,
    listInvitations,
    revokeInvitation: invitationAction("revoke"),
    resendInvitation: invitationAction("resend"),
    listUsers,
    updateStatus,
    updateRole,
    promoteToSuperAdmin,
  };
}
