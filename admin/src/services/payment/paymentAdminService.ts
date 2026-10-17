import { apiRequest } from "@/services/api/client";
import type { PaymentCurrency, PaymentTransactionStatus } from "./paymentTypes";
export type { PaymentCurrency, PaymentTransactionStatus } from "./paymentTypes";

export interface AdminPayment {
  id: string;
  registrationReference: string;
  delegateName: string;
  delegateEmail: string;
  provider: "PAYSTACK" | "FLUTTERWAVE" | "MANUAL";
  paymentSource: "PAYSTACK" | "FLUTTERWAVE" | "MANUAL";
  paymentMethod: "PAYSTACK" | "FLUTTERWAVE" | "BANK_TRANSFER" | "OFFLINE";
  paymentReference: string;
  providerTransactionId: string | null;
  packageCode: string;
  packageName: string;
  currency: PaymentCurrency;
  amountMinor: number;
  status: PaymentTransactionStatus;
  providerStatus: string | null;
  financialAuthority: "UNRESOLVED" | "AUTHORITATIVE" | "NON_AUTHORITATIVE";
  reconciliationReason: string | null;
  reconciliationAttempts: number;
  reconciliationLastAttemptAt: string | null;
  failureReason: string | null;
  isAuthoritative: boolean;
  channel: string | null;
  gatewayResponse: string | null;
  externalReference: string | null;
  payerName: string | null;
  internalNote: string | null;
  paymentDate: string | null;
  recordedByAdminId: string | null;
  recordedByName: string | null;
  confirmedByAdminId: string | null;
  confirmedByName: string | null;
  confirmedAt: string | null;
  confirmationEmailStatus: string;
  createdAt: string;
  paidAt: string | null;
  verifiedAt: string | null;
}

export interface AdminPaymentDetail extends AdminPayment {
  events: Array<{ eventType: string; createdAt: string }>;
}

export interface ManualPaymentEligibility {
  registrationReference: string;
  delegateName: string;
  delegateEmail: string;
  packageCode: string;
  packageName: string;
  currency: PaymentCurrency;
  amountMinor: number | null;
  eligible: boolean;
  reason: string | null;
}

interface Envelope<T> {
  success: true;
  data: T;
}

export async function getAdminPayments(filters: {
  page?: number;
  search?: string;
  status?: PaymentTransactionStatus;
  currency?: PaymentCurrency;
}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const result = await apiRequest<
    Envelope<{ payments: { items: AdminPayment[]; total: number; page: number; limit: number } }>
  >(`/admin/payments?${query.toString()}`);
  return result.ok && result.data
    ? { ok: true as const, payments: result.data.data.payments }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getAdminPayment(paymentReference: string) {
  const result = await apiRequest<Envelope<{ payment: AdminPaymentDetail }>>(
    `/admin/payments/${encodeURIComponent(paymentReference)}`,
  );
  return result.ok && result.data
    ? { ok: true as const, payment: result.data.data.payment }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function retryAdminPaymentCompletion(paymentReference: string) {
  const result = await apiRequest<Envelope<Record<string, never>>>(
    `/admin/payments/${encodeURIComponent(paymentReference)}/completion/retry`,
    { method: "POST" },
  );
  return result.ok
    ? { ok: true as const }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function reconcileAdminPayments(limit = 10) {
  const result = await apiRequest<
    Envelope<{
      summary: {
        examined: number;
        authoritative: number;
        duplicateSuccess: number;
        unresolved: number;
        providerErrors: number;
      };
    }>
  >("/admin/payments/reconcile", { method: "POST", body: { limit } });
  return result.ok && result.data
    ? { ok: true as const, summary: result.data.data.summary }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getManualPaymentEligibility(
  registrationReference: string,
  currency: PaymentCurrency,
) {
  const result = await apiRequest<Envelope<{ eligibility: ManualPaymentEligibility }>>(
    `/admin/payments/manual/eligibility/${encodeURIComponent(registrationReference)}?currency=${currency}`,
  );
  return result.ok && result.data
    ? { ok: true as const, eligibility: result.data.data.eligibility }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function recordManualPayment(input: {
  registrationReference: string;
  method: "BANK_TRANSFER" | "OFFLINE";
  currency: PaymentCurrency;
  amountMinor: number;
  externalReference: string;
  paymentDate: string;
  payerName?: string | null;
  internalNote?: string | null;
}) {
  const { payerName, internalNote, ...required } = input;
  const result = await apiRequest<Envelope<{ payment: AdminPayment }>>("/admin/payments/manual", {
    method: "POST",
    body: {
      ...required,
      ...(typeof payerName === "string" && payerName.trim() ? { payerName } : {}),
      ...(typeof internalNote === "string" && internalNote.trim() ? { internalNote } : {}),
    },
  });
  return result.ok && result.data
    ? { ok: true as const, payment: result.data.data.payment }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function confirmManualPayment(paymentReference: string) {
  const result = await apiRequest<Envelope<{ payment: AdminPayment; alreadyConfirmed: boolean }>>(
    `/admin/payments/manual/${encodeURIComponent(paymentReference)}/confirm`,
    {
      method: "POST",
    },
  );
  return result.ok && result.data
    ? {
        ok: true as const,
        payment: result.data.data.payment,
        alreadyConfirmed: result.data.data.alreadyConfirmed,
      }
    : { ok: false as const, status: result.status, error: result.error };
}
