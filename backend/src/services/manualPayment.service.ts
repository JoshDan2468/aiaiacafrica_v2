import { randomBytes } from "node:crypto";
import { reportRecoveredPaymentError } from "../observability/operationContext";
import type { ManualPaymentRepository } from "../repositories/manualPayment.repository";
import type { PaymentRepository } from "../repositories/payment.repository";
import type {
  PaymentCurrency,
  PaymentMethod,
  PaymentRecord,
} from "../types/payment";
import type { PaymentCompletionService } from "./paymentCompletion.service";

export class ManualPaymentNotFoundError extends Error {}
export class ManualPaymentIneligibleError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}
export class ManualPaymentAmountMismatchError extends Error {
  constructor(readonly expectedAmountMinor: number) {
    super(
      "Manual payment amount does not match the active authoritative price",
    );
  }
}
export class ManualPaymentConflictError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

export interface RecordManualPaymentCommand {
  readonly registrationReference: string;
  readonly method: Extract<PaymentMethod, "BANK_TRANSFER" | "OFFLINE">;
  readonly currency: PaymentCurrency;
  readonly amountMinor: number;
  readonly externalReference: string;
  readonly paymentDate: Date;
  readonly payerName?: string | undefined;
  readonly internalNote?: string | undefined;
  readonly adminId: string;
}

export function createManualPaymentReference(): string {
  return `AIAIAC-MAN-${randomBytes(12).toString("hex").toUpperCase()}`;
}

export class ManualPaymentService {
  constructor(
    private readonly manualRepository: ManualPaymentRepository,
    private readonly payments: Pick<PaymentRepository, "findByReference">,
    private readonly completion: Pick<PaymentCompletionService, "process">,
    private readonly nextReference: () => string = createManualPaymentReference,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async inspectEligibility(
    registrationReference: string,
    currency: PaymentCurrency,
  ) {
    const eligibility = await this.manualRepository.inspectEligibility(
      registrationReference,
      currency,
    );
    if (!eligibility) throw new ManualPaymentNotFoundError();
    return eligibility;
  }

  async record(command: RecordManualPaymentCommand): Promise<PaymentRecord> {
    if (command.paymentDate.getTime() > this.now().getTime() + 5 * 60_000) {
      throw new ManualPaymentIneligibleError("PAYMENT_DATE_IN_FUTURE");
    }
    const result = await this.manualRepository.record({
      ...command,
      paymentReference: this.nextReference(),
    });
    if (result.kind === "not_found") throw new ManualPaymentNotFoundError();
    if (result.kind === "ineligible")
      throw new ManualPaymentIneligibleError(result.reason);
    if (result.kind === "amount_mismatch")
      throw new ManualPaymentAmountMismatchError(result.expectedAmountMinor);
    if (result.kind === "duplicate_pending")
      throw new ManualPaymentConflictError("PENDING_MANUAL_PAYMENT_EXISTS");
    if (result.kind === "duplicate_external_reference")
      throw new ManualPaymentConflictError(
        "EXTERNAL_REFERENCE_ALREADY_RECORDED",
      );
    const payment = await this.payments.findByReference(
      result.paymentReference,
    );
    if (!payment) throw new Error("Recorded manual payment disappeared");
    return payment;
  }

  async confirm(
    paymentReference: string,
    adminId: string,
  ): Promise<{ payment: PaymentRecord; alreadyConfirmed: boolean }> {
    const result = await this.manualRepository.confirm(
      paymentReference,
      adminId,
    );
    if (result.kind === "not_found") throw new ManualPaymentNotFoundError();
    if (result.kind === "not_pending")
      throw new ManualPaymentConflictError("MANUAL_PAYMENT_NOT_PENDING");
    if (result.kind === "already_paid")
      throw new ManualPaymentConflictError("REGISTRATION_ALREADY_PAID");
    if (result.kind === "ineligible")
      throw new ManualPaymentIneligibleError(result.reason);
    const payment = await this.payments.findByReference(
      result.paymentReference,
    );
    if (!payment) throw new Error("Confirmed manual payment disappeared");
    if (result.kind === "confirmed") {
      try {
        await this.completion.process(payment);
      } catch (error) {
        reportRecoveredPaymentError(error, "manual_payment_completion", paymentReference);
        console.error("Manual payment completion workflow failed", {
          paymentReference,
          errorType:
            error instanceof Error ? error.name : "UnknownCompletionError",
        });
      }
    }
    return {
      payment,
      alreadyConfirmed: result.kind === "already_confirmed",
    };
  }
}
