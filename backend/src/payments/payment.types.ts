import type { PaymentCurrency } from "../types/payment";

export interface InitializeProviderPaymentInput {
  email: string;
  amountMinor: number;
  currency: PaymentCurrency;
  reference: string;
  callbackUrl: string;
  metadata: {
    registrationReference: string;
    paymentReference: string;
    packageCode: string;
  };
}

export interface InitializedProviderPayment {
  authorizationUrl: string;
  accessCode: string | null;
  reference: string;
}

export interface VerifiedProviderPayment {
  reference: string;
  status: string;
  amountMinor: number;
  requestedAmountMinor?: number | null;
  currency: string;
  providerTransactionId: string;
  channel: string | null;
  gatewayResponse: string | null;
  paidAt: Date | null;
  customerEmail: string | null;
}

export interface PaymentProvider {
  initialize(
    input: InitializeProviderPaymentInput,
  ): Promise<InitializedProviderPayment>;
  verify(
    reference: string,
    transactionId?: string,
  ): Promise<VerifiedProviderPayment>;
}
