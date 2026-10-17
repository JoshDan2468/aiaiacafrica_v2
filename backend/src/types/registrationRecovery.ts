import type { PaymentStatus } from "./delegate";
import type { PaymentTransactionStatus } from "./payment";
import type { StudentVerificationStatus } from "./studentVerification";

export interface RegistrationRecoveryWorkspace {
  delegateName: string;
  registrationReference: string;
  delegateType: "PROFESSIONAL" | "STUDENT";
  emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  paymentStatus: PaymentStatus;
  latestPaymentStatus: PaymentTransactionStatus | null;
  studentVerificationStatus: StudentVerificationStatus | null;
  eventPassStatus: "ACTIVE" | "REVOKED" | null;
  availablePrices: readonly { currency: "USD" | "NGN"; amountMinor: number }[];
}

export interface RegistrationRecoveryRecipient {
  registrationId: string;
  registrationReference: string;
  email: string;
  fullName: string;
}

export interface PaymentRecoveryNotificationClaim extends RegistrationRecoveryRecipient {
  notificationId: string;
  delegateType: "PROFESSIONAL" | "STUDENT";
  paymentStatus: "FAILED" | "ABANDONED";
}

export interface RegistrationNotificationClaim {
  id: string;
  email: string;
  fullName: string;
  registrationReference: string;
  delegateName: string;
  delegateType: "PROFESSIONAL" | "STUDENT";
  companyName: string;
  country: string;
  submittedAt: Date;
}
