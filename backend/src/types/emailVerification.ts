export type EmailVerificationStatus = "UNVERIFIED" | "VERIFIED";
export type EmailVerificationRequestKind = "INITIAL" | "RESEND";

export interface EmailVerificationRecipient {
  readonly registrationId: string;
  readonly registrationReference: string;
  readonly email: string;
  readonly fullName: string;
  readonly delegateType: "PROFESSIONAL" | "STUDENT";
  readonly expiresAt: Date;
}

export type EmailVerificationIssueResult =
  | { readonly kind: "ISSUED"; readonly recipient: EmailVerificationRecipient }
  | { readonly kind: "ALREADY_VERIFIED" }
  | { readonly kind: "NOT_FOUND" };

export type EmailVerificationResult =
  | {
      readonly kind: "VERIFIED";
      readonly registrationReference: string;
      readonly delegateType: "PROFESSIONAL" | "STUDENT";
      readonly availablePrices: readonly {
        readonly currency: "USD" | "NGN";
        readonly amountMinor: number;
      }[];
    }
  | { readonly kind: "INVALID" | "EXPIRED" | "USED" };
