import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import {
  DelegatePackageUnavailableError,
  DuplicateDelegateRegistrationError,
} from "../repositories/delegate.repository";
import { DelegateService } from "../services/delegate.service";
import {
  delegateDetailParamsSchema,
  delegateRegistrationSchema,
  parseDelegateListFilters,
} from "../validators/delegate.validator";

interface DelegateControllerOptions {
  readonly delegateService: DelegateService;
}

export function createDelegateController(options: DelegateControllerOptions) {
  const getPublicPackages: RequestHandler = async (
    _request,
    response,
    next,
  ) => {
    try {
      const packages = await options.delegateService.listPublicPackages();
      response.status(200).json({ success: true, data: { packages } });
    } catch (error) {
      next(error);
    }
  };

  const createRegistration: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      const parsed = delegateRegistrationSchema.safeParse(request.body);
      if (!parsed.success) {
        next(createPublicError(400, "Invalid delegate registration request"));
        return;
      }
      const registration = await options.delegateService.createRegistration(
        parsed.data,
      );
      response.status(201).json({
        success: true,
        message: "Delegate registration submitted successfully.",
        data: {
          reference: registration.reference,
          registrationStatus: registration.registrationStatus,
          paymentStatus: registration.paymentStatus,
          email: registration.email,
          emailVerificationStatus: registration.emailVerificationStatus,
          verificationEmailSent: registration.verificationEmailSent,
        },
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
            "The selected delegate package is not available.",
          ),
        );
        return;
      }
      next(error);
    }
  };

  const listAdminRegistrations: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      const filters = parseDelegateListFilters(request.query);
      if (!filters) {
        next(createPublicError(400, "Invalid delegate list filters"));
        return;
      }
      const registrations =
        await options.delegateService.listRegistrations(filters);
      response.status(200).json({
        success: true,
        data: {
          registrations: {
            ...registrations,
            items: registrations.items.map((item) => ({
              id: item.id,
              reference: item.reference,
              firstName: item.firstName,
              lastName: item.lastName,
              email: item.email,
              companyName: item.companyName,
              packageName: item.packageName,
              country: item.country,
              registrationStatus: item.registrationStatus,
              paymentStatus: item.paymentStatus,
              emailVerificationStatus: item.emailVerificationStatus,
              submittedAt: item.submittedAt,
            })),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  const getAdminRegistration: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      const parsed = delegateDetailParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        next(
          createPublicError(400, "Invalid delegate registration identifier"),
        );
        return;
      }
      const registration = await options.delegateService.findRegistrationById(
        parsed.data.id,
      );
      if (!registration) {
        next(createPublicError(404, "Delegate registration not found"));
        return;
      }
      response.status(200).json({ success: true, data: { registration } });
    } catch (error) {
      next(error);
    }
  };

  return {
    getPublicPackages,
    createRegistration,
    listAdminRegistrations,
    getAdminRegistration,
  };
}
