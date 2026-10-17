import { z } from "zod";
import type { PaymentListFilters } from "../types/payment";

export const flutterwaveWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    tx_ref: z.string().regex(/^AIAIAC-PAY-[A-Z0-9]{24}$/),
    id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  }),
});

export const paymentCurrencies = ["USD", "NGN"] as const;
export const paymentTransactionStatuses = [
  "INITIALIZED",
  "PENDING",
  "PENDING_CONFIRMATION",
  "PAID",
  "FAILED",
  "ABANDONED",
  "REVERSED",
  "DUPLICATE_SUCCESS",
  "RECONCILIATION_REQUIRED",
] as const;

export const paymentReconciliationSchema = z
  .object({ limit: z.coerce.number().int().min(1).max(25).default(10) })
  .strict();

export const registrationPaymentParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/),
});

export const paymentParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-PAY-[A-Z0-9]{24}$/),
});

export const adminPaymentParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-(?:PAY|MAN)-[A-Z0-9]{24}$/),
});

export const manualPaymentParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-MAN-[A-Z0-9]{24}$/),
});

export const manualPaymentEligibilityParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/),
});

export const manualPaymentEligibilityQuerySchema = z.strictObject({
  currency: z.enum(paymentCurrencies),
});

export const recordManualPaymentSchema = z.strictObject({
  registrationReference: z.string().regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/),
  method: z.enum(["BANK_TRANSFER", "OFFLINE"]),
  currency: z.enum(paymentCurrencies),
  amountMinor: z.number().int().positive(),
  externalReference: z.string().trim().min(2).max(120),
  paymentDate: z.string().datetime(),
  payerName: z.string().trim().min(2).max(160).optional(),
  internalNote: z.string().trim().min(2).max(1000).optional(),
});

export const initializePaymentSchema = z.strictObject({
  currency: z.enum(paymentCurrencies),
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]).default("PAYSTACK"),
});

const optionalSearch = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.string().max(100).optional(),
);

const adminPaymentListSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: optionalSearch,
    status: z.enum(paymentTransactionStatuses).optional(),
    currency: z.enum(paymentCurrencies).optional(),
  })
  .strict();

export function parsePaymentListFilters(
  input: unknown,
): PaymentListFilters | null {
  const parsed = adminPaymentListSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

const paystackChargeWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.union([z.string(), z.number()]),
    status: z.string(),
    reference: z.string(),
    amount: z.number().int(),
    requested_amount: z.number().int().positive().optional(),
    currency: z.string(),
    channel: z.string().nullable().optional(),
    gateway_response: z.string().nullable().optional(),
    paid_at: z.string().datetime().nullable().optional(),
    customer: z.object({ email: z.string().email() }),
  }),
});

const paystackRefundWebhookSchema = z.object({
  event: z.enum([
    "refund.pending",
    "refund.processing",
    "refund.needs-attention",
    "refund.failed",
    "refund.processed",
  ]),
  data: z.object({
    status: z.string(),
    transaction_reference: z.string(),
    refund_reference: z.string().nullable().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
  }),
});

export const paystackWebhookSchema = z.union([
  paystackChargeWebhookSchema,
  paystackRefundWebhookSchema,
]);
