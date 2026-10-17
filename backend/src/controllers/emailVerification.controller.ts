import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import {
  EmailVerificationService,
  EmailVerificationTokenError,
  genericEmailVerificationResendMessage,
} from "../services/emailVerification.service";
import type { RegistrationRecoveryService } from "../services/registrationRecovery.service";
import {
  emailVerificationResendSchema,
  emailVerificationTokenSchema,
} from "../validators/emailVerification.validator";

export function createEmailVerificationController(
  service: EmailVerificationService,
  recovery?: Pick<RegistrationRecoveryService, "createContinuationForRegistration">,
) {
  const verify: RequestHandler = async (request, response, next) => {
    try {
      const parsed = emailVerificationTokenSchema.safeParse(request.body);
      if (!parsed.success) throw new EmailVerificationTokenError();
      const result = await service.verify(parsed.data.token);
      if (result.kind !== "VERIFIED") {
        next(createPublicError(400, "Verification link is invalid or expired"));
        return;
      }
      let continuationToken: string | null = null;
      if (recovery) {
        try {
          continuationToken = (
            await recovery.createContinuationForRegistration(result.registrationReference)
          ).continuationToken;
        } catch (error) {
          console.error("Verified registration continuation creation failed", {
            registrationReference: result.registrationReference,
            errorType: error instanceof Error ? error.name : "UnknownContinuationError",
          });
        }
      }
      response.status(200).json({
        success: true,
        message: "Email address verified successfully.",
        data: {
          registrationReference: result.registrationReference,
          delegateType: result.delegateType,
          emailVerificationStatus: "VERIFIED",
          availablePrices: result.availablePrices,
          continuationToken,
        },
      });
    } catch (error) {
      if (error instanceof EmailVerificationTokenError) {
        next(createPublicError(400, "Verification link is invalid or expired"));
        return;
      }
      next(error);
    }
  };

  const resend: RequestHandler = async (request, response, next) => {
    try {
      const parsed = emailVerificationResendSchema.safeParse(request.body);
      if (parsed.success) {
        await service.resend(
          parsed.data.registrationReference,
          parsed.data.email,
        );
      }
      response.status(202).json({
        success: true,
        message: genericEmailVerificationResendMessage,
      });
    } catch (error) {
      next(error);
    }
  };

  return { verify, resend };
}
