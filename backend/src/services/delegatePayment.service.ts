/**
 * Delegate Payment Service
 *
 * Responsible for resolving trusted registration pricing, initializing
 * payment attempts, and finalizing verified payments idempotently. Browser
 * input never supplies an authoritative amount.
 */

import { randomBytes } from "node:crypto";
import { reportRecoveredPaymentError } from "../observability/operationContext";
import {
  PaymentProviderUnavailableError,
  PaymentRequestError,
  PaymentService,
} from "../payments/payment.service";
import type { VerifiedProviderPayment } from "../payments/payment.types";
import type {
  PaymentRepository,
  SuccessfulPaymentInput,
} from "../repositories/payment.repository";
import type {
  OnlinePaymentProvider,
  PaymentCurrency,
  PaymentDetail,
  PaymentListFilters,
  PaymentListResult,
  PaymentRecord,
} from "../types/payment";
import type { PaymentCompletionService } from "./paymentCompletion.service";

export class PaymentNotFoundError extends Error {}
export class PaymentRegistrationIneligibleError extends Error {}
export class PaymentAlreadyPaidError extends Error {}
export class PaymentPriceUnavailableError extends Error {}
export class PaymentInitializationInProgressError extends Error {}
export class PaymentRetryUnavailableError extends Error {}
export class PaymentInitializationFailedError extends PaymentRequestError {
  constructor() {
    super(false);
  }
}
export class PaymentVerificationMismatchError extends Error {}
export class PaymentCompletionIneligibleError extends Error {}

export function createPaymentReference(): string {
  return `AIAIAC-PAY-${randomBytes(12).toString("hex").toUpperCase()}`;
}

function displayAmount(amountMinor: number, currency: PaymentCurrency): string {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function safePayment(payment: PaymentRecord) {
  return {
    provider: payment.provider,
    paymentReference: payment.paymentReference,
    registrationReference: payment.registrationReference,
    package: payment.packageName,
    currency: payment.currency,
    amountMinor: payment.amountMinor,
    displayAmount: displayAmount(payment.amountMinor, payment.currency),
    status: payment.status,
    authorizationUrl: payment.authorizationUrl,
    accessCode: payment.accessCode,
    paidAt: payment.paidAt,
  };
}

export interface PaymentReconciliationSummary {
  examined: number;
  authoritative: number;
  duplicateSuccess: number;
  unresolved: number;
  providerErrors: number;
}

export class DelegatePaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly payments: PaymentService,
    private readonly completion: Pick<PaymentCompletionService, "process"> &
      Partial<Pick<PaymentCompletionService, "notifyReconciliation">>,
    private readonly callbackUrl: string,
    private readonly nextReference: () => string = createPaymentReference,
    private readonly paymentRecovery?: {
      sendPaymentRecovery(paymentReference: string): Promise<void>;
    },
    private readonly callbackUrls: Partial<
      Record<OnlinePaymentProvider, string>
    > = {},
  ) {}

  async initialize(
    registrationReference: string,
    currency: PaymentCurrency,
    provider: OnlinePaymentProvider = "PAYSTACK",
  ) {
    return this.initializeAttempt(
      registrationReference,
      currency,
      false,
      provider,
    );
  }

  async retry(
    registrationReference: string,
    currency: PaymentCurrency,
    provider: OnlinePaymentProvider = "PAYSTACK",
  ) {
    return this.initializeAttempt(
      registrationReference,
      currency,
      true,
      provider,
    );
  }

  private async initializeAttempt(
    registrationReference: string,
    currency: PaymentCurrency,
    replaceActive: boolean,
    provider: OnlinePaymentProvider,
  ) {
    this.payments.requireProvider(provider);
    const preparation = await this.repository.prepareInitialization(
      registrationReference,
      currency,
      this.nextReference(),
      replaceActive,
      provider,
    );
    if (preparation.kind === "not_found") throw new PaymentNotFoundError();
    if (preparation.kind === "ineligible")
      throw new PaymentRegistrationIneligibleError();
    if (preparation.kind === "already_paid")
      throw new PaymentAlreadyPaidError();
    if (preparation.kind === "price_unavailable")
      throw new PaymentPriceUnavailableError();
    if (preparation.kind === "retry_blocked")
      throw new PaymentRetryUnavailableError();
    if (preparation.kind === "initializing")
      throw new PaymentInitializationInProgressError();
    if (preparation.kind === "existing")
      return safePayment(preparation.payment);

    try {
      await this.repository.recordProviderObservation(
        preparation.payment.paymentReference,
        "initialization_dispatched",
      );
      const initialized = await this.payments.initialize(
        {
          email: preparation.email,
          amountMinor: preparation.payment.amountMinor,
          currency: preparation.payment.currency,
          reference: preparation.payment.paymentReference,
          callbackUrl: this.callbackUrls[provider] ?? this.callbackUrl,
          metadata: {
            registrationReference: preparation.registrationReference,
            paymentReference: preparation.payment.paymentReference,
            packageCode: preparation.packageCode,
          },
        },
        provider,
      );
      if (initialized.reference !== preparation.payment.paymentReference) {
        throw new PaymentRequestError(true);
      }
      const payment = await this.repository.completeInitialization(
        preparation.payment.paymentReference,
        initialized.authorizationUrl,
        initialized.accessCode,
      );
      if (!payment) throw new PaymentRequestError();
      return safePayment(payment);
    } catch (error) {
      if (error instanceof PaymentRequestError && !error.ambiguous) {
        await this.repository.failInitialization(
          preparation.payment.paymentReference,
        );
        await this.runPaymentRecovery(preparation.payment.paymentReference);
      } else {
        await this.repository.recordProviderObservation(
          preparation.payment.paymentReference,
          "initialization_uncertain",
        );
      }
      if (
        error instanceof PaymentProviderUnavailableError ||
        error instanceof PaymentRequestError ||
        error instanceof PaymentInitializationFailedError
      ) {
        throw error;
      }
      throw new PaymentInitializationFailedError();
    }
  }

  async verify(paymentReference: string, transactionId?: string) {
    const local = await this.repository.findByReference(paymentReference);
    if (!local) throw new PaymentNotFoundError();
    if (local.status === "PAID") {
      await this.runCompletion(local);
      return safePayment(local);
    }
    if (local.status === "DUPLICATE_SUCCESS") return safePayment(local);

    if (local.provider === "MANUAL")
      throw new PaymentRegistrationIneligibleError();
    let provider: VerifiedProviderPayment;
    try {
      provider = await this.payments.verify(
        paymentReference,
        local.provider,
        transactionId,
      );
    } catch (error) {
      // A signed webhook may have committed PAID while the provider request was in flight.
      const current = await this.repository.findByReference(paymentReference);
      if (current?.status === "DUPLICATE_SUCCESS") {
        reportRecoveredPaymentError(
          error,
          "provider_verify_after_webhook",
          paymentReference,
        );
        return safePayment(current);
      }
      if (current?.status !== "PAID") throw error;
      reportRecoveredPaymentError(
        error,
        "provider_verify_after_webhook",
        paymentReference,
      );
      await this.runCompletion(current);
      return safePayment(current);
    }
    const current = await this.repository.findByReference(paymentReference);
    if (current?.status === "PAID") {
      await this.runCompletion(current);
      return safePayment(current);
    }
    if (provider.status !== "success") {
      if (["failed", "abandoned", "reversed"].includes(provider.status)) {
        if (
          provider.status === "reversed" &&
          local.financialAuthority !== "UNRESOLVED"
        ) {
          const reversed = await this.repository.recordRefundState(
            paymentReference,
            provider.status,
          );
          if (reversed) await this.runReconciliationAlert(reversed);
          return safePayment(reversed ?? local);
        }
        await this.repository.recordVerificationFailure(
          paymentReference,
          `PROVIDER_${provider.status.toUpperCase()}`,
        );
        const failed = await this.repository.findByReference(paymentReference);
        if (failed && ["FAILED", "ABANDONED"].includes(failed.status)) {
          await this.runPaymentRecovery(failed.paymentReference);
        }
        return safePayment(failed ?? local);
      }
      await this.repository.recordProviderObservation(
        paymentReference,
        provider.status,
      );
      const observed = await this.repository.findByReference(paymentReference);
      return safePayment(observed ?? local);
    }
    return this.finalize(local, provider);
  }

  async processPaystackWebhook(event: {
    event: string;
    data:
      | {
          id: string | number;
          status: string;
          reference: string;
          amount: number;
          requested_amount?: number | undefined;
          currency: string;
          channel?: string | null | undefined;
          gateway_response?: string | null | undefined;
          paid_at?: string | null | undefined;
          customer: { email: string };
        }
      | {
          status: string;
          transaction_reference: string;
          refund_reference?: string | null | undefined;
          amount?: string | number | undefined;
          currency?: string | undefined;
        };
  }): Promise<{ processed: boolean; status?: string }> {
    if (
      event.event.startsWith("refund.") &&
      "transaction_reference" in event.data
    ) {
      const refundPayment = await this.repository.findByReference(
        event.data.transaction_reference,
      );
      if (!refundPayment || refundPayment.provider !== "PAYSTACK")
        return { processed: false };
      const updated = await this.repository.recordRefundState(
        event.data.transaction_reference,
        event.data.status,
      );
      if (updated) await this.runReconciliationAlert(updated);
      return updated
        ? { processed: true, status: updated.status }
        : { processed: false };
    }
    if (event.event !== "charge.success" || event.data.status !== "success") {
      return { processed: false };
    }
    if (!("reference" in event.data)) return { processed: false };
    const local = await this.repository.findByReference(event.data.reference);
    if (!local || local.provider !== "PAYSTACK") return { processed: false };
    try {
      const result = await this.finalize(local, {
        reference: event.data.reference,
        status: event.data.status,
        amountMinor: event.data.amount,
        requestedAmountMinor: event.data.requested_amount ?? null,
        currency: event.data.currency,
        providerTransactionId: String(event.data.id),
        channel: event.data.channel ?? null,
        gatewayResponse: event.data.gateway_response ?? null,
        paidAt: event.data.paid_at ? new Date(event.data.paid_at) : null,
        customerEmail: event.data.customer.email.trim().toLowerCase(),
      });
      return { processed: true, status: result.status };
    } catch (error) {
      if (error instanceof PaymentVerificationMismatchError) {
        reportRecoveredPaymentError(
          error,
          "webhook_verification_mismatch",
          local.paymentReference,
        );
        return { processed: false };
      }
      throw error;
    }
  }

  async processFlutterwaveWebhook(event: {
    event: string;
    data: { tx_ref: string; id: string | number };
  }) {
    if (event.event !== "charge.completed") return { processed: false };
    const local = await this.repository.findByReference(event.data.tx_ref);
    if (!local || local.provider !== "FLUTTERWAVE") return { processed: false };
    // The authenticated notification is only a hint. Verify the persisted merchant reference.
    const payment = await this.verify(
      local.paymentReference,
      String(event.data.id),
    );
    return { processed: true, status: payment.status };
  }

  private async finalize(
    local: PaymentRecord,
    provider: VerifiedProviderPayment,
  ) {
    const input: SuccessfulPaymentInput = {
      paymentReference: local.paymentReference,
      providerReference: provider.reference,
      providerTransactionId: provider.providerTransactionId,
      amountMinor: provider.requestedAmountMinor ?? provider.amountMinor,
      chargedAmountMinor: provider.amountMinor,
      currency: provider.currency,
      customerEmail: provider.customerEmail,
      channel: provider.channel,
      gatewayResponse: provider.gatewayResponse,
      paidAt: provider.paidAt,
    };
    const result = await this.repository.finalizeSuccessfulPayment(input);
    if (result.kind === "not_found") throw new PaymentNotFoundError();
    if (result.kind === "mismatch") {
      if (local.provider === "FLUTTERWAVE") {
        await this.repository.recordProviderObservation(
          local.paymentReference,
          "verification_mismatch",
        );
      }
      throw new PaymentVerificationMismatchError();
    }
    if (result.kind === "paid") await this.runCompletion(result.payment);
    else await this.runReconciliationAlert(result.payment);
    return safePayment(result.payment);
  }

  async reconcile(
    limit: number,
    initiatedBy = "SYSTEM",
  ): Promise<PaymentReconciliationSummary> {
    const candidates = await this.repository.claimReconciliationCandidates(
      Math.min(Math.max(limit, 1), 25),
      new Date(),
      initiatedBy,
      this.payments.availableProviders(),
    );
    const summary: PaymentReconciliationSummary = {
      examined: candidates.length,
      authoritative: 0,
      duplicateSuccess: 0,
      unresolved: 0,
      providerErrors: 0,
    };
    for (const candidate of candidates) {
      try {
        const payment = await this.verify(candidate.paymentReference);
        if (payment.status === "PAID") summary.authoritative += 1;
        else if (payment.status === "DUPLICATE_SUCCESS")
          summary.duplicateSuccess += 1;
        else summary.unresolved += 1;
      } catch (error) {
        if (
          error instanceof PaymentProviderUnavailableError ||
          error instanceof PaymentRequestError ||
          error instanceof PaymentVerificationMismatchError
        ) {
          reportRecoveredPaymentError(
            error,
            "payment_reconciliation",
            candidate.paymentReference,
          );
          summary.providerErrors += 1;
          continue;
        }
        throw error;
      }
    }
    return summary;
  }

  private async runCompletion(payment: PaymentRecord): Promise<void> {
    try {
      await this.completion.process(payment);
    } catch (error) {
      reportRecoveredPaymentError(
        error,
        "payment_completion",
        payment.paymentReference,
      );
      console.error("Payment completion workflow failed", {
        provider: payment.provider,
        paymentReference: payment.paymentReference,
        errorType:
          error instanceof Error ? error.name : "UnknownCompletionError",
      });
    }
  }

  private async runReconciliationAlert(payment: PaymentRecord): Promise<void> {
    if (!this.completion.notifyReconciliation) return;
    try {
      await this.completion.notifyReconciliation(payment);
    } catch (error) {
      reportRecoveredPaymentError(
        error,
        "reconciliation_alert",
        payment.paymentReference,
      );
      console.error("Payment reconciliation alert workflow failed", {
        provider: payment.provider,
        paymentReference: payment.paymentReference,
        errorType: error instanceof Error ? error.name : "UnknownAlertError",
      });
    }
  }

  private async runPaymentRecovery(paymentReference: string): Promise<void> {
    if (!this.paymentRecovery) return;
    try {
      await this.paymentRecovery.sendPaymentRecovery(paymentReference);
    } catch (error) {
      reportRecoveredPaymentError(error, "payment_recovery", paymentReference);
      console.error("Payment recovery workflow failed", {
        paymentReference,
        errorType: error instanceof Error ? error.name : "UnknownRecoveryError",
      });
    }
  }

  listPayments(filters: PaymentListFilters): Promise<PaymentListResult> {
    return this.repository.listPayments(filters);
  }

  findPaymentDetail(reference: string): Promise<PaymentDetail | null> {
    return this.repository.findPaymentDetail(reference);
  }

  async retryCompletion(paymentReference: string): Promise<void> {
    const payment = await this.repository.findByReference(paymentReference);
    if (!payment) throw new PaymentNotFoundError();
    if (payment.status !== "PAID") throw new PaymentCompletionIneligibleError();
    await this.completion.process(payment);
  }
}
