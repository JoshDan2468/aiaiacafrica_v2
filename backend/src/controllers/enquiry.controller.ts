import type { NextFunction, RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import {
  EnquiryDuplicateKeyError,
  EnquiryNotFoundError,
  EnquiryTransitionConflictError,
} from "../repositories/enquiry.repository";
import type { EnquiryService } from "../services/enquiry.service";
import type { EnquiryDecision } from "../types/enquiry";
import {
  enquiryDecisionSchema,
  enquiryReferenceSchema,
  enquiryRetrySchema,
  enquirySubmissionSchema,
  parseEnquiryListFilters,
} from "../validators/enquiry.validator";

function handleEnquiryError(error: unknown, next: NextFunction): void {
  if (error instanceof EnquiryDuplicateKeyError)
    next(
      createPublicError(
        409,
        "This enquiry request key was already used with different details.",
      ),
    );
  else if (error instanceof EnquiryNotFoundError)
    next(createPublicError(404, "Enquiry not found."));
  else if (error instanceof EnquiryTransitionConflictError)
    next(
      createPublicError(
        409,
        "The enquiry status has changed. Refresh and try again.",
      ),
    );
  else next(error);
}

export function createEnquiryController(service: EnquiryService) {
  const create: RequestHandler = async (request, response, next) => {
    try {
      const parsed = enquirySubmissionSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid enquiry submission"));
        return;
      }
      const result = await service.create(parsed.data);
      response.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created
          ? "Enquiry submitted successfully."
          : "This enquiry was already received.",
        data: {
          reference: result.reference,
          category: result.category,
          subject: result.subject,
          status: result.status,
          submittedAt: result.submittedAt,
          acknowledgement: result.acknowledgement,
        },
      });
    } catch (error) {
      handleEnquiryError(error, next);
    }
  };

  const list: RequestHandler = async (request, response, next) => {
    try {
      const filters = parseEnquiryListFilters(request.query);
      if (!filters) {
        next(createPublicError(400, "Invalid enquiry filters"));
        return;
      }
      const enquiries = await service.list(filters);
      response.status(200).json({ success: true, data: { enquiries } });
    } catch (error) {
      next(error);
    }
  };

  const detail: RequestHandler = async (request, response, next) => {
    try {
      const params = enquiryReferenceSchema.safeParse(request.params);
      if (!params.success) {
        next(createPublicError(400, "Invalid enquiry reference"));
        return;
      }
      const enquiry = await service.getDetail(params.data.reference);
      if (!enquiry) throw new EnquiryNotFoundError();
      response.status(200).json({ success: true, data: { enquiry } });
    } catch (error) {
      handleEnquiryError(error, next);
    }
  };

  const transition =
    (nextStatus: EnquiryDecision): RequestHandler =>
    async (request, response, next) => {
      try {
        const params = enquiryReferenceSchema.safeParse(request.params);
        const body = enquiryDecisionSchema.safeParse(request.body);
        if (!params.success || !body.success || !response.locals.admin) {
          next(createPublicError(400, "Invalid enquiry status change"));
          return;
        }
        const result = await service.transition(
          params.data.reference,
          nextStatus,
          response.locals.admin.id,
          body.data.note ?? null,
        );
        response.status(200).json({ success: true, data: { enquiry: result } });
      } catch (error) {
        handleEnquiryError(error, next);
      }
    };

  const retryNotifications: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      const params = enquiryReferenceSchema.safeParse(request.params);
      const body = enquiryRetrySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        next(createPublicError(400, "Invalid enquiry notification retry"));
        return;
      }
      const attempted = await service.retryNotifications(params.data.reference);
      response.status(200).json({ success: true, data: { attempted } });
    } catch (error) {
      handleEnquiryError(error, next);
    }
  };

  return {
    create,
    list,
    detail,
    markInProgress: transition("IN_PROGRESS"),
    resolve: transition("RESOLVED"),
    close: transition("CLOSED"),
    retryNotifications,
  };
}
