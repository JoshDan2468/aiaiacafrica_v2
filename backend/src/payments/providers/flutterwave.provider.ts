/** Flutterwave Standard v3 hosted checkout. All amounts cross this boundary as exact decimals. */
import { z } from "zod";
import { PaymentRequestError } from "../payment.service";
import type {
  InitializeProviderPaymentInput,
  PaymentProvider,
  VerifiedProviderPayment,
} from "../payment.types";

const money = z.union([z.string(), z.number()]);
const verification = z.object({
  status: z.literal("success"),
  data: z.object({
    id: z.union([z.string().min(1), z.number().int().positive()]),
    tx_ref: z.string().min(1),
    status: z.string(),
    amount: money,
    charged_amount: money,
    currency: z.string(),
    customer: z.object({ email: z.string().email() }),
    payment_type: z.string().optional(),
    processor_response: z.string().optional(),
  }),
});
export function flutterwaveMinorUnits(value: string | number): number {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new PaymentRequestError();
  const [whole, fraction = ""] = text.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0)
    throw new PaymentRequestError();
  return minor;
}
export class FlutterwaveProvider implements PaymentProvider {
  constructor(
    private readonly secretKey: string,
    private readonly request: typeof fetch = fetch,
  ) {}
  private async send(path: string, init?: RequestInit): Promise<unknown> {
    try {
      const response = await this.request(
        `https://api.flutterwave.com/v3/${path}`,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) throw new PaymentRequestError();
      return await response.json();
    } catch {
      throw new PaymentRequestError();
    }
  }
  async initialize(input: InitializeProviderPaymentInput) {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
      throw new PaymentRequestError(false);
    const body = await this.send("payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: `${Math.floor(input.amountMinor / 100)}.${String(input.amountMinor % 100).padStart(2, "0")}`,
        currency: input.currency,
        redirect_url: input.callbackUrl,
        customer: { email: input.email },
        meta: input.metadata,
        customizations: { title: "AIAIAC 2027 delegate registration" },
        configurations: { session_duration: 10, max_retry_attempt: 1 },
      }),
    });
    const parsed = z
      .object({
        status: z.literal("success"),
        data: z.object({ link: z.string().url() }),
      })
      .safeParse(body);
    if (!parsed.success) {
      // An explicit API rejection proves no link was returned; malformed responses remain uncertain.
      if (
        z
          .object({ status: z.literal("error"), message: z.string() })
          .safeParse(body).success
      )
        throw new PaymentRequestError(false);
      throw new PaymentRequestError();
    }
    const url = new URL(parsed.data.data.link);
    const allowedHost =
      url.hostname === "checkout.flutterwave.com" ||
      (this.secretKey.startsWith("FLWSECK_TEST-") &&
        url.hostname === "checkout-v2.dev-flutterwave.com");
    if (
      url.protocol !== "https:" ||
      !allowedHost ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      throw new PaymentRequestError();
    return {
      reference: input.reference,
      authorizationUrl: url.href,
      accessCode: null,
    };
  }
  async verify(
    reference: string,
    transactionId?: string,
  ): Promise<VerifiedProviderPayment> {
    const path = transactionId
      ? `transactions/${encodeURIComponent(transactionId)}/verify`
      : `transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
    const parsed = verification.safeParse(await this.send(path));
    if (!parsed.success) throw new PaymentRequestError();
    const tx = parsed.data.data;
    if (transactionId && String(tx.id) !== transactionId)
      throw new PaymentRequestError();
    return {
      reference: tx.tx_ref,
      // A failed charge does not prove the hosted checkout can no longer accept another charge.
      status: tx.status === "successful" ? "success" : "pending",
      amountMinor: flutterwaveMinorUnits(tx.charged_amount),
      requestedAmountMinor: flutterwaveMinorUnits(tx.amount),
      currency: tx.currency,
      providerTransactionId: String(tx.id),
      customerEmail: tx.customer.email.trim().toLowerCase(),
      channel: tx.payment_type ?? null,
      gatewayResponse: tx.processor_response ?? null,
      paidAt: null,
    };
  }
}
