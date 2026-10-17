export type PaymentCurrency = "USD" | "NGN";
export type OnlinePaymentProvider = "PAYSTACK" | "FLUTTERWAVE";
export type PaymentProviderName = OnlinePaymentProvider | "MANUAL";
export type PaymentSource = OnlinePaymentProvider | "MANUAL";
export type PaymentMethod = OnlinePaymentProvider | "BANK_TRANSFER" | "OFFLINE";
export type PaymentTransactionStatus =
  | "INITIALIZED"
  | "PENDING"
  | "PENDING_CONFIRMATION"
  | "PAID"
  | "FAILED"
  | "ABANDONED"
  | "REVERSED"
  | "DUPLICATE_SUCCESS"
  | "RECONCILIATION_REQUIRED";
export type PaymentFinancialAuthority =
  "UNRESOLVED" | "AUTHORITATIVE" | "NON_AUTHORITATIVE";
export type ConfirmationEmailStatus =
  "NOT_QUEUED" | "PENDING" | "SENT" | "FAILED";

export interface PaymentRecord {
  id: string;
  registrationId: string;
  registrationReference: string;
  delegateName: string;
  delegateEmail: string;
  provider: PaymentProviderName;
  paymentSource: PaymentSource;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  providerTransactionId: string | null;
  packageCode: string;
  packageName: string;
  currency: PaymentCurrency;
  amountMinor: number;
  status: PaymentTransactionStatus;
  providerStatus: string | null;
  financialAuthority: PaymentFinancialAuthority;
  reconciliationReason: string | null;
  reconciliationAttempts: number;
  reconciliationLastAttemptAt: Date | null;
  failureReason: string | null;
  authoritativePaymentTransactionId: string | null;
  authorizationUrl: string | null;
  accessCode: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  externalReference: string | null;
  payerName: string | null;
  internalNote: string | null;
  paymentDate: Date | null;
  recordedByAdminId: string | null;
  recordedByName: string | null;
  confirmedByAdminId: string | null;
  confirmedByName: string | null;
  confirmedAt: Date | null;
  confirmationEmailStatus: ConfirmationEmailStatus;
  createdAt: Date;
  paidAt: Date | null;
  verifiedAt: Date | null;
}

export interface PaymentListFilters {
  page: number;
  limit: number;
  search?: string | undefined;
  status?: PaymentTransactionStatus | undefined;
  currency?: PaymentCurrency | undefined;
}

export interface PaymentListResult {
  items: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentDetail extends PaymentRecord {
  events: Array<{
    eventType:
      | "PAYMENT_INITIALIZED"
      | "PAYMENT_CONFIRMED"
      | "PAYMENT_VERIFICATION_FAILED"
      | "PAYMENT_DUPLICATE_SUCCESS"
      | "PAYMENT_RECONCILIATION_ATTEMPTED"
      | "PAYMENT_RECONCILIATION_REQUIRED"
      | "PAYMENT_RECONCILIATION_RESOLVED"
      | "MANUAL_PAYMENT_RECORDED"
      | "MANUAL_PAYMENT_CONFIRMED"
      | "MANUAL_PAYMENT_CONFIRMATION_FAILED"
      | "EVENT_PASS_ISSUED"
      | "DELEGATE_CONFIRMATION_SENT"
      | "DELEGATE_CONFIRMATION_FAILED"
      | "ADMIN_PAYMENT_NOTIFICATION_SENT"
      | "ADMIN_PAYMENT_NOTIFICATION_FAILED";
    createdAt: Date;
  }>;
}
