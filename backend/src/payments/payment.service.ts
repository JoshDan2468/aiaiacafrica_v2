/** Provider registry. Persisted attempts, never browser input, select verification. */
import type { OnlinePaymentProvider } from "../types/payment";
import type {
  InitializeProviderPaymentInput,
  PaymentProvider,
} from "./payment.types";

export class PaymentProviderUnavailableError extends Error {
  constructor() {
    super("Payment provider is not configured");
    this.name = "PaymentProviderUnavailableError";
  }
}
export class PaymentRequestError extends Error {
  constructor(readonly ambiguous = true) {
    super("Payment provider request failed");
    this.name = "PaymentRequestError";
  }
}
export class PaymentService {
  private readonly providers: Partial<
    Record<OnlinePaymentProvider, PaymentProvider>
  >;
  constructor(
    provider:
      | PaymentProvider
      | null
      | Partial<Record<OnlinePaymentProvider, PaymentProvider>>,
  ) {
    this.providers =
      provider && "initialize" in provider
        ? { PAYSTACK: provider }
        : (provider ?? {});
  }
  availableProviders(): OnlinePaymentProvider[] {
    return (["PAYSTACK", "FLUTTERWAVE"] as const).filter((name) =>
      Boolean(this.providers[name]),
    );
  }
  requireProvider(name: OnlinePaymentProvider): PaymentProvider {
    const provider = this.providers[name];
    if (!provider) throw new PaymentProviderUnavailableError();
    return provider;
  }
  initialize(
    input: InitializeProviderPaymentInput,
    name: OnlinePaymentProvider = "PAYSTACK",
  ) {
    return this.requireProvider(name).initialize(input);
  }
  verify(
    reference: string,
    name: OnlinePaymentProvider = "PAYSTACK",
    transactionId?: string,
  ) {
    return this.requireProvider(name).verify(reference, transactionId);
  }
}
