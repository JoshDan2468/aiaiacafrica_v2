import { apiRequest } from "@/services/api/client";
import type { PaymentCurrency, PaymentTransactionStatus } from "./paymentTypes";
export type { PaymentCurrency, PaymentTransactionStatus } from "./paymentTypes";

export type OnlinePaymentProvider = "PAYSTACK" | "FLUTTERWAVE";

export interface PaymentSummary {
  provider: OnlinePaymentProvider;
  paymentReference: string;
  registrationReference: string;
  package: string;
  currency: PaymentCurrency;
  amountMinor: number;
  displayAmount: string;
  status: PaymentTransactionStatus;
  authorizationUrl: string | null;
  accessCode: string | null;
  paidAt: string | null;
}

interface Envelope<T> {
  success: true;
  data: T;
}

export async function initializeDelegatePayment(
  registrationReference: string,
  currency: PaymentCurrency,
  provider: OnlinePaymentProvider = "PAYSTACK",
) {
  const result = await apiRequest<Envelope<{ payment: PaymentSummary }>>(
    `/delegate-registrations/${encodeURIComponent(registrationReference)}/payment/initialize`,
    { method: "POST", body: { currency, provider } },
  );
  return result.ok && result.data
    ? { ok: true as const, payment: result.data.data.payment }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function verifyDelegatePayment(paymentReference: string) {
  const result = await apiRequest<Envelope<{ payment: PaymentSummary }>>(
    `/payments/${encodeURIComponent(paymentReference)}/verify`,
  );
  return result.ok && result.data
    ? { ok: true as const, payment: result.data.data.payment }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function retryDelegatePayment(
  continuationToken: string,
  currency: PaymentCurrency,
  provider: OnlinePaymentProvider = "PAYSTACK",
) {
  const result = await apiRequest<Envelope<{ payment: PaymentSummary }>>(
    "/delegate-registration-recovery/payment/retry",
    { method: "POST", body: { continuationToken, currency, provider } },
  );
  return result.ok && result.data
    ? { ok: true as const, payment: result.data.data.payment }
    : { ok: false as const, status: result.status, error: result.error };
}
