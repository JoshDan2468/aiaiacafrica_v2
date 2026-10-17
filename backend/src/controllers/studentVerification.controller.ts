import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createPublicError } from "../middleware/error.middleware";
import {
  DelegatePackageUnavailableError,
  DuplicateDelegateRegistrationError,
} from "../repositories/delegate.repository";
import type { StudentVerificationService } from "../services/studentVerification.service";
import type { StudentVerificationWorkflowService } from "../services/studentVerificationWorkflow.service";
import {
  StudentEvidenceAuthorizationError,
  StudentEvidenceNotAvailableError,
  type StudentEvidenceService,
} from "../services/studentEvidence.service";
import {
  StudentEvidenceReplacementNotFoundError,
  StudentEvidenceSlotOccupiedError,
  StudentEvidenceUploadIneligibleError,
  StudentEvidenceVersionLimitError,
} from "../repositories/studentEvidence.repository";
import {
  StudentRecoveryTokenInvalidError,
  StudentVerificationEvidenceNotReadyError,
  StudentVerificationNotFoundError,
  StudentVerificationTransitionConflictError,
} from "../repositories/studentVerificationWorkflow.repository";
import {
  InvalidStudentEvidenceFileError,
  StudentEvidenceFileTooLargeError,
  studentContinuationTokenSchema,
  studentEvidenceReferenceParamsSchema,
  studentEvidenceReplacementParamsSchema,
  studentEvidenceTypeSchema,
} from "../validators/studentEvidence.validator";
import {
  parseStudentVerificationListFilters,
  studentApprovalSchema,
  studentApplicationSchema,
  studentMoreInformationSchema,
  studentRecoveryExchangeSchema,
  studentRecoveryRequestSchema,
  studentRejectionSchema,
  studentVerificationSubmissionSchema,
} from "../validators/studentVerification.validator";
import { genericStudentRecoveryMessage } from "../services/studentVerificationWorkflow.service";

export function createStudentVerificationController(
  service: StudentVerificationService,
  evidenceService?: StudentEvidenceService,
  workflowService?: StudentVerificationWorkflowService,
  evidenceEnabled = true,
) {
  const evidenceOnly = (handler: RequestHandler): RequestHandler => (request, response, next) => {
    if (!evidenceEnabled) {
      response.setHeader("Cache-Control", "no-store");
      next(
        createPublicError(
          503,
          "Student evidence upload and verification submission are temporarily unavailable",
        ),
      );
      return;
    }
    return handler(request, response, next);
  };
  const createApplication: RequestHandler = async (request, response, next) => {
    try {
      const parsed = studentApplicationSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid Student Delegate application"));
        return;
      }
      const application = await service.createApplication(parsed.data);
      response.status(201).json({
        success: true,
        message: "Student Delegate application saved",
        data: application,
      });
    } catch (error) {
      if (error instanceof DuplicateDelegateRegistrationError) {
        next(
          createPublicError(
            409,
            "A registration already exists for this email and package.",
          ),
        );
        return;
      }
      if (error instanceof DelegatePackageUnavailableError) {
        next(
          createPublicError(
            400,
            "The Student Delegate package is unavailable.",
          ),
        );
        return;
      }
      next(error);
    }
  };

  const list: RequestHandler = async (request, response, next) => {
    try {
      const filters = parseStudentVerificationListFilters(request.query);
      if (!filters) {
        next(createPublicError(400, "Invalid Student verification filters"));
        return;
      }
      const verifications = await service.list(filters);
      response.status(200).json({ success: true, data: { verifications } });
    } catch (error) {
      next(error);
    }
  };

  const authorizeEvidenceAccess: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (!evidenceService)
        throw new Error("Student evidence service is unavailable");
      const params = studentEvidenceReferenceParamsSchema.safeParse({
        reference: request.params["reference"],
      });
      const token = studentContinuationTokenSchema.safeParse(
        request.header("x-aiaiac-continuation-token"),
      );
      if (!params.success || !token.success)
        throw new StudentEvidenceAuthorizationError();
      response.locals.studentEvidenceAuthorization =
        await evidenceService.authorizeContinuation(
          params.data.reference,
          token.data,
        );
      next();
    } catch (error) {
      if (error instanceof StudentEvidenceAuthorizationError) {
        next(
          createPublicError(
            401,
            "Student evidence authorization is invalid or expired",
          ),
        );
        return;
      }
      next(error);
    }
  };

  const authorizeEvidenceUpload: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    const evidenceType = studentEvidenceTypeSchema.safeParse(
      request.header("x-aiaiac-evidence-type"),
    );
    if (!evidenceType.success) {
      next(createPublicError(400, "Invalid Student evidence type"));
      return;
    }
    response.locals.studentEvidenceType = evidenceType.data;
    void authorizeEvidenceAccess(request, response, next);
  };

  const listEvidence: RequestHandler = async (_request, response, next) => {
    try {
      if (!evidenceService || !response.locals.studentEvidenceAuthorization) {
        throw new StudentEvidenceAuthorizationError();
      }
      const evidence = await evidenceService.list(
        response.locals.studentEvidenceAuthorization,
      );
      response.status(200).json({ success: true, data: { evidence } });
    } catch (error) {
      next(error);
    }
  };

  const getVerificationState: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      if (!workflowService || !response.locals.studentEvidenceAuthorization) {
        throw new StudentEvidenceAuthorizationError();
      }
      const verification = await workflowService.getStudentState(
        response.locals.studentEvidenceAuthorization,
      );
      if (!verification) {
        next(createPublicError(404, "Student verification not found"));
        return;
      }
      response.status(200).json({ success: true, data: { verification } });
    } catch (error) {
      next(error);
    }
  };

  const submitForVerification: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (
        !workflowService ||
        !response.locals.studentEvidenceAuthorization ||
        !studentVerificationSubmissionSchema.safeParse(request.body).success
      ) {
        next(createPublicError(400, "Invalid verification submission"));
        return;
      }
      const result = await workflowService.submit(
        response.locals.studentEvidenceAuthorization,
      );
      response.status(200).json({
        success: true,
        message: "Student verification submitted for review",
        data: result,
      });
    } catch (error) {
      handleWorkflowError(error, next);
    }
  };

  const requestRecovery: RequestHandler = async (request, response, next) => {
    try {
      if (!workflowService)
        throw new Error("Student verification workflow is unavailable");
      const parsed = studentRecoveryRequestSchema.safeParse(request.body);
      if (parsed.success) {
        await workflowService.requestRecovery(
          parsed.data.registrationReference,
          parsed.data.email,
        );
      }
      response.status(202).json({
        success: true,
        message: genericStudentRecoveryMessage,
      });
    } catch (error) {
      next(error);
    }
  };

  const exchangeRecovery: RequestHandler = async (request, response, next) => {
    try {
      if (!workflowService)
        throw new Error("Student verification workflow is unavailable");
      const parsed = studentRecoveryExchangeSchema.safeParse(request.body);
      if (!parsed.success) throw new StudentRecoveryTokenInvalidError();
      const access = await workflowService.exchangeRecovery(
        parsed.data.recoveryToken,
      );
      response.status(200).json({
        success: true,
        message: "Student verification access restored",
        data: access,
      });
    } catch (error) {
      if (error instanceof StudentRecoveryTokenInvalidError) {
        next(createPublicError(400, "Recovery link is invalid or expired"));
        return;
      }
      next(error);
    }
  };

  const getAdminDetail: RequestHandler = async (request, response, next) => {
    try {
      if (!workflowService)
        throw new Error("Student verification workflow is unavailable");
      const params = studentEvidenceReferenceParamsSchema.safeParse(
        request.params,
      );
      if (!params.success) {
        next(createPublicError(400, "Invalid Student verification reference"));
        return;
      }
      const verification = await workflowService.getAdminDetail(
        params.data.reference,
      );
      if (!verification) {
        next(createPublicError(404, "Student verification not found"));
        return;
      }
      response.status(200).json({ success: true, data: { verification } });
    } catch (error) {
      next(error);
    }
  };

  const review = (
    action: "MORE_INFORMATION_REQUIRED" | "APPROVED" | "REJECTED",
    schema:
      | typeof studentApprovalSchema
      | typeof studentMoreInformationSchema
      | typeof studentRejectionSchema,
  ): RequestHandler => {
    return async (request, response, next) => {
      try {
        if (!workflowService || !response.locals.admin)
          throw new Error("Student verification workflow is unavailable");
        const params = studentEvidenceReferenceParamsSchema.safeParse(
          request.params,
        );
        const body = schema.safeParse(request.body);
        if (!params.success || !body.success) {
          next(createPublicError(400, "Invalid Student review decision"));
          return;
        }
        const note =
          "reason" in body.data
            ? body.data.reason
            : "note" in body.data
              ? (body.data.note ?? null)
              : null;
        const result = await workflowService.review(
          params.data.reference,
          action,
          response.locals.admin.id,
          note,
        );
        response.status(200).json({
          success: true,
          message: "Student verification decision recorded",
          data: result,
        });
      } catch (error) {
        handleWorkflowError(error, next);
      }
    };
  };

  const retryNotifications: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (!workflowService)
        throw new Error("Student verification workflow is unavailable");
      const params = studentEvidenceReferenceParamsSchema.safeParse(
        request.params,
      );
      if (!params.success) {
        next(createPublicError(400, "Invalid Student verification reference"));
        return;
      }
      const attempted = await workflowService.retryNotifications(
        params.data.reference,
      );
      response.status(200).json({
        success: true,
        message: "Student notification retry processed",
        data: { attempted },
      });
    } catch (error) {
      next(error);
    }
  };

  const handleEvidenceUpload = async (
    request: Request,
    response: Response,
    next: NextFunction,
    replacementEvidenceId?: string,
  ) => {
    try {
      if (
        !evidenceService ||
        !response.locals.studentEvidenceAuthorization ||
        !response.locals.studentEvidenceType ||
        !request.file
      ) {
        next(createPublicError(400, "A Student evidence file is required"));
        return;
      }
      const result = await evidenceService.upload(
        response.locals.studentEvidenceAuthorization,
        response.locals.studentEvidenceType,
        request.file,
        replacementEvidenceId,
      );
      response.status(201).json({
        success: true,
        message: replacementEvidenceId
          ? "Student evidence replacement received"
          : "Student evidence received",
        data: result,
      });
    } catch (error) {
      if (error instanceof StudentEvidenceFileTooLargeError) {
        next(createPublicError(413, "Evidence file exceeds the 5 MB limit"));
        return;
      }
      if (error instanceof InvalidStudentEvidenceFileError) {
        next(
          createPublicError(400, "The uploaded evidence file is not accepted"),
        );
        return;
      }
      if (error instanceof StudentEvidenceSlotOccupiedError) {
        next(
          createPublicError(
            409,
            "Replace the existing evidence for this category",
          ),
        );
        return;
      }
      if (error instanceof StudentEvidenceReplacementNotFoundError) {
        next(createPublicError(404, "Evidence replacement target not found"));
        return;
      }
      if (error instanceof StudentEvidenceVersionLimitError) {
        next(createPublicError(409, "Evidence replacement limit reached"));
        return;
      }
      if (error instanceof StudentEvidenceUploadIneligibleError) {
        next(
          createPublicError(409, "This verification cannot accept evidence"),
        );
        return;
      }
      next(error);
    }
  };

  const uploadEvidence: RequestHandler = (request, response, next) =>
    void handleEvidenceUpload(request, response, next);

  const replaceEvidence: RequestHandler = (request, response, next) => {
    const params = studentEvidenceReplacementParamsSchema.safeParse(
      request.params,
    );
    if (!params.success) {
      next(createPublicError(400, "Invalid evidence replacement request"));
      return;
    }
    void handleEvidenceUpload(request, response, next, params.data.evidenceId);
  };

  const downloadEvidence: RequestHandler = async (request, response, next) => {
    try {
      if (!evidenceService)
        throw new Error("Student evidence service is unavailable");
      const params = studentEvidenceReplacementParamsSchema.safeParse(
        request.params,
      );
      const admin = response.locals.admin;
      if (!params.success || !admin) {
        next(createPublicError(400, "Invalid evidence download request"));
        return;
      }
      const download = await evidenceService.downloadForAdmin(
        params.data.reference,
        params.data.evidenceId,
        admin.id,
      );
      const asciiFilename = download.displayFilename.replace(
        /[^\x20-\x7e]|["\\]/g,
        "_",
      );
      const encodedFilename = encodeURIComponent(
        download.displayFilename,
      ).replace(
        /['()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      );
      response.set({
        "Content-Type": download.detectedMimeType,
        "Content-Length": String(download.bytes.length),
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      });
      response.status(200).send(download.bytes);
    } catch (error) {
      if (error instanceof StudentEvidenceNotAvailableError) {
        next(createPublicError(404, "Evidence document is not available"));
        return;
      }
      next(error);
    }
  };

  return {
    createApplication,
    list: evidenceOnly(list),
    authorizeEvidenceAccess: evidenceOnly(authorizeEvidenceAccess),
    authorizeEvidenceUpload: evidenceOnly(authorizeEvidenceUpload),
    listEvidence: evidenceOnly(listEvidence),
    getVerificationState: evidenceOnly(getVerificationState),
    submitForVerification: evidenceOnly(submitForVerification),
    requestRecovery,
    exchangeRecovery,
    getAdminDetail: evidenceOnly(getAdminDetail),
    approve: review("APPROVED", studentApprovalSchema),
    requestMoreInformation: review(
      "MORE_INFORMATION_REQUIRED",
      studentMoreInformationSchema,
    ),
    reject: review("REJECTED", studentRejectionSchema),
    retryNotifications,
    uploadEvidence: evidenceOnly(uploadEvidence),
    replaceEvidence: evidenceOnly(replaceEvidence),
    downloadEvidence: evidenceOnly(downloadEvidence),
  };
}

function handleWorkflowError(error: unknown, next: NextFunction) {
  if (error instanceof StudentVerificationEvidenceNotReadyError) {
    next(
      createPublicError(
        409,
        "Required Student evidence is not safely ready for this action",
      ),
    );
    return;
  }
  if (error instanceof StudentVerificationTransitionConflictError) {
    next(
      createPublicError(
        409,
        "Student verification state changed before this action completed",
      ),
    );
    return;
  }
  if (error instanceof StudentVerificationNotFoundError) {
    next(createPublicError(404, "Student verification not found"));
    return;
  }
  next(error);
}
