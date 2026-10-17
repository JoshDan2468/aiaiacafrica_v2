import type { NextFunction, RequestHandler } from "express";
import { CommercialImportService } from "../services/commercialImport.service";
import { createPublicError } from "../middleware/error.middleware";
import {
  CommercialApplicationNotFoundError,
  CommercialApplicationTransitionConflictError,
  CommercialPackageUnavailableError,
} from "../repositories/commercialApplication.repository";
import type { CommercialApplicationService } from "../services/commercialApplication.service";
import type { CommercialApplicationKind } from "../types/commercialApplication";
import {
  commercialConfirmationSchema,
  commercialDeclineSchema,
  commercialMoreInformationSchema,
  commercialNotificationRetrySchema,
  exhibitorApplicationSchema,
  exhibitorReferenceParamsSchema,
  parseCommercialApplicationListFilters,
  sponsorApplicationSchema,
  sponsorReferenceParamsSchema,
} from "../validators/commercialApplication.validator";

function handleCommercialError(error: unknown, next: NextFunction): void {
  if (error instanceof CommercialPackageUnavailableError) {
    next(
      createPublicError(400, "The selected commercial package is unavailable."),
    );
  } else if (error instanceof CommercialApplicationNotFoundError) {
    next(createPublicError(404, "Application not found."));
  } else if (error instanceof CommercialApplicationTransitionConflictError) {
    next(
      createPublicError(
        409,
        "The application state has changed. Refresh and try again.",
      ),
    );
  } else {
    next(error);
  }
}

export function createCommercialApplicationController(
  service: CommercialApplicationService,
  imports: CommercialImportService = new CommercialImportService(),
) {
  const createSponsor: RequestHandler = async (request, response, next) => {
    try {
      const parsed = sponsorApplicationSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid Sponsor application"));
        return;
      }
      const application = await service.createSponsor(parsed.data);
      response.status(application.created ? 201 : 200).json({
        success: true,
        message: application.created
          ? "Sponsor application submitted successfully."
          : "This Sponsor application was already received.",
        data: {
          reference: application.reference,
          applicationType: application.kind,
          selectedPackage: {
            code: application.packageCode,
            name: application.packageName,
          },
          currency: application.currency,
          priceMinor: application.priceMinor,
          status: application.status,
          nextStep: application.nextStep,
        },
      });
    } catch (error) {
      handleCommercialError(error, next);
    }
  };

  const createExhibitor: RequestHandler = async (request, response, next) => {
    try {
      const parsed = exhibitorApplicationSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid Exhibitor application"));
        return;
      }
      const application = await service.createExhibitor(parsed.data);
      response.status(application.created ? 201 : 200).json({
        success: true,
        message: application.created
          ? "Exhibitor application submitted successfully."
          : "This Exhibitor application was already received.",
        data: {
          reference: application.reference,
          applicationType: application.kind,
          selectedPackage: {
            code: application.packageCode,
            name: application.packageName,
          },
          currency: application.currency,
          priceMinor: application.priceMinor,
          status: application.status,
          nextStep: application.nextStep,
        },
      });
    } catch (error) {
      handleCommercialError(error, next);
    }
  };

  const list =
    (kind: CommercialApplicationKind): RequestHandler =>
    async (request, response, next) => {
      try {
        const filters = parseCommercialApplicationListFilters(request.query);
        if (!filters) {
          next(
            createPublicError(400, "Invalid commercial application filters"),
          );
          return;
        }
        const applications = await service.list(kind, filters);
        response.status(200).json({ success: true, data: { applications } });
      } catch (error) {
        next(error);
      }
    };

  const detail =
    (kind: CommercialApplicationKind): RequestHandler =>
    async (request, response, next) => {
      try {
        const schema =
          kind === "SPONSOR"
            ? sponsorReferenceParamsSchema
            : exhibitorReferenceParamsSchema;
        const parsed = schema.safeParse(request.params);
        if (!parsed.success) {
          next(createPublicError(400, "Invalid application reference"));
          return;
        }
        const application = await service.getDetail(
          kind,
          parsed.data.reference,
        );
        if (!application) {
          next(createPublicError(404, "Application not found"));
          return;
        }
        response.status(200).json({ success: true, data: { application } });
      } catch (error) {
        next(error);
      }
    };

  const review =
    (
      kind: CommercialApplicationKind,
      action: "MORE_INFORMATION_REQUIRED" | "CONFIRMED" | "DECLINED",
    ): RequestHandler =>
    async (request, response, next) => {
      try {
        const paramsSchema =
          kind === "SPONSOR"
            ? sponsorReferenceParamsSchema
            : exhibitorReferenceParamsSchema;
        const params = paramsSchema.safeParse(request.params);
        const body =
          action === "CONFIRMED"
            ? commercialConfirmationSchema.safeParse(request.body)
            : action === "MORE_INFORMATION_REQUIRED"
              ? commercialMoreInformationSchema.safeParse(request.body)
              : commercialDeclineSchema.safeParse(request.body);
        if (!params.success || !body.success || !response.locals.admin) {
          next(createPublicError(400, "Invalid application decision"));
          return;
        }
        const reason = "reason" in body.data ? body.data.reason : null;
        const note = "note" in body.data ? (body.data.note ?? null) : null;
        const result = await service.review(
          kind,
          params.data.reference,
          action,
          response.locals.admin.id,
          reason,
          note,
        );
        response.status(200).json({
          success: true,
          message: "Application decision recorded.",
          data: { application: result },
        });
      } catch (error) {
        handleCommercialError(error, next);
      }
    };

  const retryNotifications =
    (kind: CommercialApplicationKind): RequestHandler =>
    async (request, response, next) => {
      try {
        const paramsSchema =
          kind === "SPONSOR"
            ? sponsorReferenceParamsSchema
            : exhibitorReferenceParamsSchema;
        const params = paramsSchema.safeParse(request.params);
        const body = commercialNotificationRetrySchema.safeParse(request.body);
        if (!params.success || !body.success) {
          next(createPublicError(400, "Invalid notification retry request"));
          return;
        }
        const attempted = await service.retryNotifications(
          kind,
          params.data.reference,
        );
        response.status(200).json({ success: true, data: { attempted } });
      } catch (error) {
        next(error);
      }
    };

  const importOrganizations =
    (kind: CommercialApplicationKind, commit: boolean): RequestHandler =>
    async (request, response, next) => {
      try {
        const admin = response.locals.admin;
        if (!admin) {
          next(createPublicError(401, "Authentication required"));
          return;
        }
        const summary = await imports.process(
          kind,
          request.body,
          commit ? admin.id : null,
        );
        response.status(200).json({ success: true, data: { summary } });
      } catch (error) {
        next(error);
      }
    };
  return {
    previewSponsorImport: importOrganizations("SPONSOR", false),
    importApprovedSponsors: importOrganizations("SPONSOR", true),
    previewExhibitorImport: importOrganizations("EXHIBITOR", false),
    importApprovedExhibitors: importOrganizations("EXHIBITOR", true),
    createSponsor,
    createExhibitor,
    listSponsors: list("SPONSOR"),
    listExhibitors: list("EXHIBITOR"),
    getSponsor: detail("SPONSOR"),
    getExhibitor: detail("EXHIBITOR"),
    confirmSponsor: review("SPONSOR", "CONFIRMED"),
    requestSponsorInformation: review("SPONSOR", "MORE_INFORMATION_REQUIRED"),
    declineSponsor: review("SPONSOR", "DECLINED"),
    confirmExhibitor: review("EXHIBITOR", "CONFIRMED"),
    requestExhibitorInformation: review(
      "EXHIBITOR",
      "MORE_INFORMATION_REQUIRED",
    ),
    declineExhibitor: review("EXHIBITOR", "DECLINED"),
    retrySponsorNotifications: retryNotifications("SPONSOR"),
    retryExhibitorNotifications: retryNotifications("EXHIBITOR"),
  };
}
