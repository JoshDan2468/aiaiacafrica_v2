export type PaymentCurrency = "USD" | "NGN";
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
