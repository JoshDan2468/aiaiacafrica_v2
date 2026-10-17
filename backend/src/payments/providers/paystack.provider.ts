/** Paystack HTTP adapter. Secret credentials never leave this backend boundary. */

import { z } from "zod";
import { PaymentRequestError } from "../payment.service";
import type {
  InitializeProviderPaymentInput,
  InitializedProviderPayment,
  PaymentProvider,
  VerifiedProviderPayment,
} from "../payment.types";

const initializeResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    authorization_url: z.string().url(),
    access_code: z.string().min(1),
    reference: z.string().min(1),
  }),
});

const verifyResponseSchema = z.object({
  status: z.literal(true),
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
    customer: z
      .object({ email: z.string().email().nullable().optional() })
      .optional(),
  }),
});

export class PaystackRequestError extends PaymentRequestError {
  constructor(ambiguous = false) {
    super(ambiguous);
    this.name = "PaystackRequestError";
  }
}

export class PaystackProvider implements PaymentProvider {
  private readonly request: typeof fetch;

  constructor(
    private readonly secretKey: string,
    fetchImplementation: typeof fetch = fetch,
  ) {
    this.request = fetchImplementation;
  }

  private async send(url: string, init?: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.request(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new PaystackRequestError(true);
    }
    if (!response.ok)
      throw new PaystackRequestError(
        ![400, 401, 403, 422].includes(response.status),
      );
    try {
      return await response.json();
    } catch {
      throw new PaystackRequestError(true);
    }
  }

  async initialize(
    input: InitializeProviderPaymentInput,
  ): Promise<InitializedProviderPayment> {
    const body = await this.send(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          amount: String(input.amountMinor),
          currency: input.currency,
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: JSON.stringify(input.metadata),
        }),
      },
    );
    const parsed = initializeResponseSchema.safeParse(body);
    if (!parsed.success) throw new PaystackRequestError(true);
    return {
      authorizationUrl: parsed.data.data.authorization_url,
      accessCode: parsed.data.data.access_code,
      reference: parsed.data.data.reference,
    };
  }

  async verify(reference: string): Promise<VerifiedProviderPayment> {
    const body = await this.send(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    );
    const parsed = verifyResponseSchema.safeParse(body);
    if (!parsed.success) throw new PaystackRequestError(true);
    const data = parsed.data.data;
    return {
      reference: data.reference,
      status: data.status,
      amountMinor: data.amount,
      requestedAmountMinor: data.requested_amount ?? null,
      currency: data.currency,
      providerTransactionId: String(data.id),
      channel: data.channel ?? null,
      gatewayResponse: data.gateway_response ?? null,
      paidAt: data.paid_at ? new Date(data.paid_at) : null,
      customerEmail: data.customer?.email?.trim().toLowerCase() ?? null,
    };
  }
}
