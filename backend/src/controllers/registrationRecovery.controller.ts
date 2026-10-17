import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import { PaymentProviderUnavailableError } from "../payments/payment.service";
import { PaymentRequestError } from "../payments/payment.service";
import {
  PaymentAlreadyPaidError,
  PaymentInitializationFailedError,
  PaymentInitializationInProgressError,
  PaymentPriceUnavailableError,
  PaymentRegistrationIneligibleError,
  PaymentRetryUnavailableError,
  type DelegatePaymentService,
} from "../services/delegatePayment.service";
import type { EmailVerificationService } from "../services/emailVerification.service";
import {
  RegistrationRecoveryService,
  RegistrationRecoveryTokenError,
} from "../services/registrationRecovery.service";
import {
  registrationContinuationSchema,
  registrationRecoveryExchangeSchema,
  registrationRecoveryRequestSchema,
  registrationRetryPaymentSchema,
} from "../validators/delegate.validator";

export const genericRegistrationRecoveryMessage =
  "If an eligible registration exists for that email, a secure continuation link has been sent.";

function recoveryError(error: unknown) {
  if (error instanceof RegistrationRecoveryTokenError)
    return createPublicError(
      400,
      "Continuation link or access token is invalid or expired",
    );
  if (error instanceof PaymentAlreadyPaidError)
    return createPublicError(409, "This registration is already paid");
  if (error instanceof PaymentRegistrationIneligibleError)
    return createPublicError(
      409,
      "This registration is not eligible for payment",
    );
  if (error instanceof PaymentPriceUnavailableError)
    return createPublicError(
      409,
      "The requested payment currency is not available",
    );
  if (error instanceof PaymentInitializationInProgressError)
    return createPublicError(
      409,
      "Payment initialization is already in progress",
    );
  if (error instanceof PaymentRetryUnavailableError)
    return createPublicError(
      409,
      "A payment is pending or requires review. Check its status before attempting another payment",
    );
  if (error instanceof PaymentInitializationFailedError)
    return createPublicError(502, "Payment provider request failed");
  if (error instanceof PaymentProviderUnavailableError)
    return createPublicError(503, "Payment provider is unavailable");
  if (error instanceof PaymentRequestError)
    return createPublicError(502, "Payment provider request failed");
  return error;
}

export function createRegistrationRecoveryController(options: {
  recovery: RegistrationRecoveryService;
  emailVerification: EmailVerificationService;
  payments: DelegatePaymentService;
}) {
  const requestRecovery: RequestHandler = async (request, response, next) => {
    try {
      const parsed = registrationRecoveryRequestSchema.safeParse(request.body);
      if (parsed.success) await options.recovery.request(parsed.data.email);
      response
        .status(202)
        .json({ success: true, message: genericRegistrationRecoveryMessage });
    } catch (error) {
      next(error);
    }
  };

  const exchangeRecovery: RequestHandler = async (request, response, next) => {
    try {
      const parsed = registrationRecoveryExchangeSchema.safeParse(request.body);
      if (!parsed.success) throw new RegistrationRecoveryTokenError();
      const access = await options.recovery.exchange(parsed.data.recoveryToken);
      response.status(200).json({ success: true, data: access });
    } catch (error) {
      next(recoveryError(error));
    }
  };

  const getWorkspace: RequestHandler = async (request, response, next) => {
    try {
      const parsed = registrationContinuationSchema.safeParse(request.body);
      if (!parsed.success) throw new RegistrationRecoveryTokenError();
      const workspace = await options.recovery.authorize(
        parsed.data.continuationToken,
      );
      response.status(200).json({ success: true, data: { workspace } });
    } catch (error) {
      next(recoveryError(error));
    }
  };

  const resendVerification: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      const parsed = registrationContinuationSchema.safeParse(request.body);
      if (!parsed.success) throw new RegistrationRecoveryTokenError();
      const workspace = await options.recovery.authorize(
        parsed.data.continuationToken,
      );
      if (workspace.emailVerificationStatus === "UNVERIFIED") {
        await options.emailVerification.issueInitial(
          workspace.registrationReference,
        );
      }
      response.status(202).json({
        success: true,
        message:
          "If verification is still required, a new secure link has been sent.",
      });
    } catch (error) {
      next(recoveryError(error));
    }
  };

  const checkPayment: RequestHandler = async (request, response, next) => {
    try {
      const parsed = registrationContinuationSchema.safeParse(request.body);
      if (!parsed.success) throw new RegistrationRecoveryTokenError();
      let workspace = await options.recovery.authorize(
        parsed.data.continuationToken,
      );
      if (
        workspace.latestPaymentStatus === "INITIALIZED" ||
        workspace.latestPaymentStatus === "PENDING"
      ) {
        const paymentReference =
          await options.recovery.findLatestPaymentReference(
            workspace.registrationReference,
          );
        if (paymentReference) await options.payments.verify(paymentReference);
        workspace = await options.recovery.authorize(
          parsed.data.continuationToken,
        );
      }
      response.status(200).json({ success: true, data: { workspace } });
    } catch (error) {
      next(recoveryError(error));
    }
  };

  const retryPayment: RequestHandler = async (request, response, next) => {
    try {
      const parsed = registrationRetryPaymentSchema.safeParse(request.body);
      if (!parsed.success) throw new RegistrationRecoveryTokenError();
      const workspace = await options.recovery.authorize(
        parsed.data.continuationToken,
      );
      const payment = await options.payments.retry(
        workspace.registrationReference,
        parsed.data.currency,
        parsed.data.provider,
      );
      response.status(200).json({ success: true, data: { payment } });
    } catch (error) {
      next(recoveryError(error));
    }
  };

  return {
    requestRecovery,
    exchangeRecovery,
    getWorkspace,
    resendVerification,
    checkPayment,
    retryPayment,
  };
}
