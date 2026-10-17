export type DelegateType = "PROFESSIONAL" | "STUDENT";
export type RegistrationStatus =
  "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PaymentStatus =
  "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

export interface DelegatePackagePrice {
  currency: "USD" | "NGN";
  amountMinor: number;
}

export interface DelegatePackage {
  id: string;
  slug: string;
  name: string;
  delegateType: DelegateType;
  description: string;
  benefits: string[];
  currency: string | null;
  priceMinor: number | null;
  prices: DelegatePackagePrice[];
  paymentAvailable: boolean;
  verificationRequired: boolean;
  pricingStatus: "AVAILABLE" | "TO_BE_CONFIRMED";
}

export interface DelegateRegistrationInput {
  packageId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  telephone?: string | undefined;
  jobTitle: string;
  companyName: string;
  country: string;
  primaryActivity: string;
  mainObjective: string;
  heardAboutSource: string;
  privacyConsent: true;
  dataSharingConsent: boolean;
}

export interface CreatedDelegateRegistration {
  id: string;
  reference: string;
  registrationStatus: "SUBMITTED";
  paymentStatus: "PENDING";
  submittedAt: Date;
  email: string;
  emailVerificationStatus: "UNVERIFIED";
  verificationEmailSent?: boolean | undefined;
}

export interface DelegateListItem {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  packageName: string;
  country: string;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  submittedAt: Date;
}

export interface DelegateRegistrationDetail extends DelegateListItem {
  email: string;
  mobile: string;
  telephone: string | null;
  jobTitle: string;
  primaryActivity: string;
  mainObjective: string;
  heardAboutSource: string;
  privacyConsent: boolean;
  dataSharingConsent: boolean;
  packageId: string;
  packageType: DelegateType;
  packageDescription: string;
  packageBenefits: string[];
  currency: string | null;
  priceMinor: number | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerifiedAt: Date | null;
  authoritativePayment: {
    paymentReference: string;
    source: "PAYSTACK" | "MANUAL";
    method: "PAYSTACK" | "BANK_TRANSFER" | "OFFLINE";
    confirmedAt: Date | null;
  } | null;
}

export interface DelegateListFilters {
  page: number;
  limit: number;
  search?: string | undefined;
  packageId?: string | undefined;
  registrationStatus?: RegistrationStatus | undefined;
  paymentStatus?: PaymentStatus | undefined;
  country?: string | undefined;
  submittedFrom?: Date | undefined;
  submittedTo?: Date | undefined;
  sort: "submitted_desc" | "submitted_asc" | "name_asc" | "name_desc";
}

export interface DelegateListResult {
  items: DelegateListItem[];
  total: number;
  page: number;
  limit: number;
}
