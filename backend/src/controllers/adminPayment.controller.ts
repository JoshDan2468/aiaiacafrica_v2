import type { RequestHandler } from "express";
import { createPublicError } from "../middleware/error.middleware";
import type { DelegatePaymentService } from "../services/delegatePayment.service";
import {
  PaymentCompletionIneligibleError,
  PaymentNotFoundError,
} from "../services/delegatePayment.service";
import {
  ManualPaymentAmountMismatchError,
  ManualPaymentConflictError,
  ManualPaymentIneligibleError,
  ManualPaymentNotFoundError,
  type ManualPaymentService,
} from "../services/manualPayment.service";
import type { SafeAdmin } from "../types/admin";
import type { PaymentDetail, PaymentRecord } from "../types/payment";
import {
  parsePaymentListFilters,
  adminPaymentParamsSchema,
  manualPaymentEligibilityParamsSchema,
  manualPaymentEligibilityQuerySchema,
  manualPaymentParamsSchema,
  paymentReconciliationSchema,
  recordManualPaymentSchema,
} from "../validators/payment.validator";

function toAdminPayment(payment: PaymentRecord) {
  return {
    id: payment.id,
    registrationReference: payment.registrationReference,
    delegateName: payment.delegateName,
    delegateEmail: payment.delegateEmail,
    provider: payment.provider,
    paymentSource: payment.paymentSource,
    paymentMethod: payment.paymentMethod,
    paymentReference: payment.paymentReference,
    providerTransactionId: payment.providerTransactionId,
    packageCode: payment.packageCode,
    packageName: payment.packageName,
    currency: payment.currency,
    amountMinor: payment.amountMinor,
    status: payment.status,
    providerStatus: payment.providerStatus,
    financialAuthority: payment.financialAuthority,
    reconciliationReason: payment.reconciliationReason,
    reconciliationAttempts: payment.reconciliationAttempts,
    reconciliationLastAttemptAt: payment.reconciliationLastAttemptAt,
    failureReason: payment.failureReason,
    isAuthoritative: payment.authoritativePaymentTransactionId === payment.id,
    channel: payment.channel,
    gatewayResponse: payment.gatewayResponse,
    externalReference: payment.externalReference,
    payerName: payment.payerName,
    internalNote: payment.internalNote,
    paymentDate: payment.paymentDate,
    recordedByAdminId: payment.recordedByAdminId,
    recordedByName: payment.recordedByName,
    confirmedByAdminId: payment.confirmedByAdminId,
    confirmedByName: payment.confirmedByName,
    confirmedAt: payment.confirmedAt,
    confirmationEmailStatus: payment.confirmationEmailStatus,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt,
    verifiedAt: payment.verifiedAt,
  };
}

function toAdminPaymentDetail(payment: PaymentDetail) {
  return { ...toAdminPayment(payment), events: payment.events };
}

export function createAdminPaymentController(
  service: DelegatePaymentService,
  manualPayments?: ManualPaymentService,
) {
  const adminId = (response: Parameters<RequestHandler>[1]) =>
    (response.locals.admin as SafeAdmin).id;

  const handleManualError = (error: unknown, next: Parameters<RequestHandler>[2]) => {
    if (error instanceof ManualPaymentNotFoundError) {
      next(createPublicError(404, "Registration or manual payment not found"));
      return true;
    }
    if (error instanceof ManualPaymentAmountMismatchError) {
      next(
        createPublicError(
          409,
          `Amount must match the active price (${error.expectedAmountMinor} minor units)`,
        ),
      );
      return true;
    }
    if (error instanceof ManualPaymentIneligibleError) {
      next(createPublicError(409, `Manual payment is not eligible: ${error.reason}`));
      return true;
    }
    if (error instanceof ManualPaymentConflictError) {
      next(createPublicError(409, `Manual payment conflict: ${error.reason}`));
      return true;
    }
    return false;
  };
  const listPayments: RequestHandler = async (request, response, next) => {
    try {
      const filters = parsePaymentListFilters(request.query);
      if (!filters) {
        next(createPublicError(400, "Invalid payment list filters"));
        return;
      }
      const payments = await service.listPayments(filters);
      response.status(200).json({
        success: true,
        data: {
          payments: {
            ...payments,
            items: payments.items.map(toAdminPayment),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  const getPayment: RequestHandler = async (request, response, next) => {
    try {
      const params = adminPaymentParamsSchema.safeParse(request.params);
      if (!params.success) {
        next(createPublicError(400, "Invalid payment reference"));
        return;
      }
      const payment = await service.findPaymentDetail(params.data.reference);
      if (!payment) {
        next(createPublicError(404, "Payment not found"));
        return;
      }
      response.status(200).json({
        success: true,
        data: { payment: toAdminPaymentDetail(payment) },
      });
    } catch (error) {
      next(error);
    }
  };

  const retryCompletion: RequestHandler = async (request, response, next) => {
    try {
      const params = adminPaymentParamsSchema.safeParse(request.params);
      if (!params.success) {
        next(createPublicError(400, "Invalid payment reference"));
        return;
      }
      await service.retryCompletion(params.data.reference);
      response.status(200).json({
        success: true,
        message: "Payment completion workflow processed",
      });
    } catch (error) {
      if (error instanceof PaymentNotFoundError) {
        next(createPublicError(404, "Payment not found"));
        return;
      }
      if (error instanceof PaymentCompletionIneligibleError) {
        next(createPublicError(409, "Only PAID payments can be completed"));
        return;
      }
      next(error);
    }
  };

  const reconcile: RequestHandler = async (request, response, next) => {
    try {
      const body = paymentReconciliationSchema.safeParse(request.body ?? {});
      if (!body.success) {
        next(createPublicError(400, "Invalid reconciliation request"));
        return;
      }
      const initiatedBy = (response.locals.admin as { id?: string } | undefined)
        ?.id;
      const summary = await service.reconcile(
        body.data.limit,
        initiatedBy ?? "AUTHENTICATED_ADMIN",
      );
      response.status(200).json({ success: true, data: { summary } });
    } catch (error) {
      next(error);
    }
  };

  const inspectManualEligibility: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (!manualPayments) throw new Error("Manual payments are unavailable");
      const params = manualPaymentEligibilityParamsSchema.safeParse(request.params);
      const query = manualPaymentEligibilityQuerySchema.safeParse(request.query);
      if (!params.success || !query.success) {
        next(createPublicError(400, "Invalid manual payment eligibility request"));
        return;
      }
      const eligibility = await manualPayments.inspectEligibility(
        params.data.reference,
        query.data.currency,
      );
      response.status(200).json({ success: true, data: { eligibility } });
    } catch (error) {
      if (!handleManualError(error, next)) next(error);
    }
  };

  const recordManualPayment: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (!manualPayments) throw new Error("Manual payments are unavailable");
      const body = recordManualPaymentSchema.safeParse(request.body);
      if (!body.success) {
        next(createPublicError(400, "Invalid manual payment record"));
        return;
      }
      const payment = await manualPayments.record({
        ...body.data,
        paymentDate: new Date(body.data.paymentDate),
        adminId: adminId(response),
      });
      response.status(201).json({
        success: true,
        message: "Manual payment recorded for confirmation",
        data: { payment: toAdminPayment(payment) },
      });
    } catch (error) {
      if (!handleManualError(error, next)) next(error);
    }
  };

  const confirmManualPayment: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    try {
      if (!manualPayments) throw new Error("Manual payments are unavailable");
      const params = manualPaymentParamsSchema.safeParse(request.params);
      if (!params.success) {
        next(createPublicError(400, "Invalid manual payment reference"));
        return;
      }
      const result = await manualPayments.confirm(
        params.data.reference,
        adminId(response),
      );
      response.status(200).json({
        success: true,
        message: result.alreadyConfirmed
          ? "Manual payment was already confirmed"
          : "Manual payment confirmed",
        data: {
          payment: toAdminPayment(result.payment),
          alreadyConfirmed: result.alreadyConfirmed,
        },
      });
    } catch (error) {
      if (!handleManualError(error, next)) next(error);
    }
  };
  return {
    listPayments,
    getPayment,
    retryCompletion,
    reconcile,
    inspectManualEligibility,
    recordManualPayment,
    confirmManualPayment,
  };
}
