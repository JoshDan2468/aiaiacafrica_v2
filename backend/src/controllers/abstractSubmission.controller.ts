import type { NextFunction, RequestHandler } from "express";
import type { AbstractAnalysisService } from "../services/abstractAnalysis.service";
import { z } from "zod";
import { createPublicError } from "../middleware/error.middleware";
import {
  AbstractAuthorizationError,
  AbstractDeadlinePassedError,
  AbstractDuplicateError,
  AbstractNotFoundError,
  AbstractTransitionConflictError,
} from "../repositories/abstractSubmission.repository";
import {
  genericAbstractRecoveryMessage,
  type AbstractSubmissionService,
} from "../services/abstractSubmission.service";
import {
  abstractAcceptanceSchema,
  abstractContinuationTokenSchema,
  abstractNotificationRetrySchema,
  abstractRecoveryExchangeSchema,
  abstractRecoveryRequestSchema,
  abstractReferenceParamsSchema,
  abstractRejectionSchema,
  abstractResubmissionSchema,
  abstractRevisionRequestSchema,
  abstractRevisionSchema,
  abstractStartReviewSchema,
  abstractSubmissionSchema,
  parseAbstractListFilters,
} from "../validators/abstractSubmission.validator";

function handleAbstractError(error: unknown, next: NextFunction): void {
  if (error instanceof AbstractDeadlinePassedError) {
    next(
      createPublicError(
        410,
        "The AIAIAC 2027 Abstract submission deadline has passed.",
      ),
    );
  } else if (error instanceof AbstractDuplicateError) {
    next(
      createPublicError(
        409,
        "This Abstract appears to have already been submitted.",
      ),
    );
  } else if (error instanceof AbstractAuthorizationError) {
    next(
      createPublicError(
        401,
        "Abstract workspace authorization is invalid or expired.",
      ),
    );
  } else if (error instanceof AbstractNotFoundError) {
    next(createPublicError(404, "Abstract submission not found."));
  } else if (error instanceof AbstractTransitionConflictError) {
    next(
      createPublicError(
        409,
        "The Abstract state has changed. Refresh and try again.",
      ),
    );
  } else {
    next(error);
  }
}

export function createAbstractSubmissionController(
  service: AbstractSubmissionService,
  analysis?: AbstractAnalysisService,
) {
  const create: RequestHandler = async (request, response, next) => {
    try {
      const parsed = abstractSubmissionSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid Abstract submission"));
        return;
      }
      const result = await service.create(parsed.data);
      response.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created
          ? "Abstract submitted successfully."
          : "This Abstract submission was already received.",
        data: {
          reference: result.reference,
          title: result.title,
          wordCount: result.wordCount,
          status: result.status,
          submittedAt: result.submittedAt,
          continuationToken: result.continuationToken,
          continuationTokenExpiresAt: result.continuationTokenExpiresAt,
          nextStep: result.nextStep,
        },
      });
    } catch (error) {
      handleAbstractError(error, next);
    }
  };

  const authorize: RequestHandler = async (request, response, next) => {
    try {
      const params = abstractReferenceParamsSchema.safeParse(request.params);
      const token = abstractContinuationTokenSchema.safeParse(
        request.header("x-aiaiac-continuation-token"),
      );
      if (!params.success || !token.success)
        throw new AbstractAuthorizationError();
      response.locals.abstractAuthorization = await service.authorize(
        params.data.reference,
        token.data,
      );
      next();
    } catch (error) {
      handleAbstractError(error, next);
    }
  };

  const getWorkspace: RequestHandler = async (_request, response, next) => {
    try {
      const workspace = await service.getWorkspace(
        response.locals.abstractAuthorization,
      );
      if (!workspace) throw new AbstractNotFoundError();
      response.status(200).json({ success: true, data: { workspace } });
    } catch (error) {
      handleAbstractError(error, next);
    }
  };

  const updateRevision: RequestHandler = async (request, response, next) => {
    try {
      const parsed = abstractRevisionSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid Abstract revision"));
        return;
      }
      const workspace = await service.updateRevision(
        response.locals.abstractAuthorization,
        parsed.data,
      );
      response.status(200).json({ success: true, data: { workspace } });
    } catch (error) {
      handleAbstractError(error, next);
    }
  };

  const resubmit: RequestHandler = async (request, response, next) => {
    try {
      if (!abstractResubmissionSchema.safeParse(request.body).success) {
        next(createPublicError(400, "Invalid Abstract resubmission"));
        return;
      }
      const workspace = await service.resubmit(
        response.locals.abstractAuthorization,
      );
      response.status(200).json({
        success: true,
        message: "Abstract revision resubmitted successfully.",
        data: { workspace },
      });
    } catch (error) {
      handleAbstractError(error, next);
    }
  };

  const requestRecovery: RequestHandler = async (request, response, next) => {
    try {
      const parsed = abstractRecoveryRequestSchema.safeParse(request.body);
      if (parsed.success)
        await service.requestRecovery(parsed.data.reference, parsed.data.email);
      response
        .status(202)
        .json({ success: true, message: genericAbstractRecoveryMessage });
    } catch (error) {
      next(error);
    }
  };

  const exchangeRecovery: RequestHandler = async (request, response, next) => {
    try {
      const parsed = abstractRecoveryExchangeSchema.safeParse(request.body);
      if (!parsed.success) throw new AbstractAuthorizationError();
      const access = await service.exchangeRecovery(parsed.data.recoveryToken);
      response.status(200).json({ success: true, data: { access } });
    } catch (error) {
      handleAbstractError(error, next);
    }
  };

  const list: RequestHandler = async (request, response, next) => {
    try {
      const filters = parseAbstractListFilters(request.query);
      if (!filters) {
        next(createPublicError(400, "Invalid Abstract filters"));
        return;
      }
      const submissions = await service.list(filters);
      const views = await analysis?.views(
        submissions.items.map((item) => item.reference),
      );
      response.status(200).json({
        success: true,
        data: {
          submissions: {
            ...submissions,
            items: submissions.items.map((item) => ({
              ...item,
              ...(views ? { aiAnalysis: views[item.reference] } : {}),
            })),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  const getAdminDetail: RequestHandler = async (request, response, next) => {
    try {
      const params = abstractReferenceParamsSchema.safeParse(request.params);
      if (!params.success) {
        next(createPublicError(400, "Invalid Abstract reference"));
        return;
      }
      const submission = await service.getAdminDetail(params.data.reference);
      if (!submission) throw new AbstractNotFoundError();
      const views = await analysis?.views([params.data.reference]);
      response.status(200).json({
        success: true,
        data: {
          submission: {
            ...submission,
            ...(views ? { aiAnalysis: views[params.data.reference] } : {}),
          },
        },
      });
    } catch (error) {
      handleAbstractError(error, next);
    }
  };

  const review =
    (
      action: "REVIEW_STARTED" | "REVISION_REQUIRED" | "ACCEPTED" | "REJECTED",
    ): RequestHandler =>
    async (request, response, next) => {
      try {
        const params = abstractReferenceParamsSchema.safeParse(request.params);
        const body =
          action === "REVIEW_STARTED"
            ? abstractStartReviewSchema.safeParse(request.body)
            : action === "ACCEPTED"
              ? abstractAcceptanceSchema.safeParse(request.body)
              : action === "REVISION_REQUIRED"
                ? abstractRevisionRequestSchema.safeParse(request.body)
                : abstractRejectionSchema.safeParse(request.body);
        if (!params.success || !body.success || !response.locals.admin) {
          next(createPublicError(400, "Invalid Abstract review decision"));
          return;
        }
        const reason = "reason" in body.data ? body.data.reason : null;
        const note = "note" in body.data ? (body.data.note ?? null) : null;
        const result = await service.review(
          params.data.reference,
          action,
          response.locals.admin.id,
          reason,
          note,
        );
        response
          .status(200)
          .json({ success: true, data: { submission: result } });
      } catch (error) {
        handleAbstractError(error, next);
      }
    };

  const retryNotifications: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      const params = abstractReferenceParamsSchema.safeParse(request.params);
      const body = abstractNotificationRetrySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        next(createPublicError(400, "Invalid notification retry"));
        return;
      }
      const attempted = await service.retryNotifications(params.data.reference);
      response.status(200).json({ success: true, data: { attempted } });
    } catch (error) {
      next(error);
    }
  };

  const retryAnalysis: RequestHandler = async (request, response, next) => {
    try {
      const params = abstractReferenceParamsSchema.safeParse(request.params);
      if (
        !params.success ||
        !z.strictObject({}).safeParse(request.body).success
      ) {
        next(createPublicError(400, "Invalid analysis retry"));
        return;
      }
      const queued = await analysis?.retry(
        params.data.reference,
        response.locals.admin.id,
      );
      if (!queued) {
        next(
          createPublicError(
            409,
            "Analysis retry is unavailable. Refresh and check the analysis status.",
          ),
        );
        return;
      }
      response.status(202).json({ success: true, data: { queued: true } });
    } catch (error) {
      next(error);
    }
  };
  return {
    retryAnalysis,
    create,
    authorize,
    getWorkspace,
    updateRevision,
    resubmit,
    requestRecovery,
    exchangeRecovery,
    list,
    getAdminDetail,
    startReview: review("REVIEW_STARTED"),
    accept: review("ACCEPTED"),
    requestRevision: review("REVISION_REQUIRED"),
    reject: review("REJECTED"),
    retryNotifications,
  };
}
