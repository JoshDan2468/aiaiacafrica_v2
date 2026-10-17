export type DelegateType = "PROFESSIONAL" | "STUDENT";
export type RegistrationStatus =
  "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
export type LatestPaymentStatus =
  | "INITIALIZED"
  | "PENDING"
  | "PENDING_CONFIRMATION"
  | "PAID"
  | "FAILED"
  | "ABANDONED"
  | "REVERSED"
  | "DUPLICATE_SUCCESS"
  | "RECONCILIATION_REQUIRED";
export type StudentVerificationStatus =
  "NOT_SUBMITTED" | "PENDING" | "MORE_INFORMATION_REQUIRED" | "APPROVED" | "REJECTED";
export type DelegatePackageCurrency = "USD" | "NGN";

export interface DelegatePackagePrice {
  currency: DelegatePackageCurrency;
  amountMinor: number;
}

export interface DelegatePackage {
  id: string;
  slug: string;
  name: string;
  delegateType: DelegateType;
  description: string;
  benefits: string[];
  currency: DelegatePackageCurrency | null;
  priceMinor: number | null;
  prices: DelegatePackagePrice[];
  paymentAvailable: boolean;
  verificationRequired: boolean;
  pricingStatus: "AVAILABLE" | "TO_BE_CONFIRMED";
}

export interface DelegateRegistrationConfirmation {
  reference: string;
  registrationStatus: "SUBMITTED";
  paymentStatus: "PENDING";
  verificationStatus?: "NOT_SUBMITTED" | undefined;
  paymentAvailable?: boolean | undefined;
  continuationToken?: string | undefined;
  continuationTokenExpiresAt?: string | undefined;
  email: string;
  emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  verificationEmailSent?: boolean | undefined;
}
