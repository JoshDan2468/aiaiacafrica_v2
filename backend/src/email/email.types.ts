/** Transactional email contracts kept independent from any provider SDK. */

export interface TransactionalEmail {
  readonly toEmail: string;
  readonly toName: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly unsubscribeUrl?: string;
  readonly communicationDeliveryId?: string;
  readonly inlineAttachments?: readonly InlineEmailAttachment[];
}

export interface InlineEmailAttachment {
  readonly contentType: string;
  readonly filename: string;
  readonly contentId: string;
  readonly base64Content: string;
}

export interface EmailProvider {
  send(message: TransactionalEmail): Promise<void | EmailProviderAcceptance>;
}

export interface EmailProviderAcceptance {
  readonly provider: "MAILJET";
  readonly status: "accepted";
  readonly messageUuid: string;
  readonly messageId: string | null;
}

export interface AdminInvitationEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly role: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
}

export interface EmailVerificationEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly registrationReference: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
}

export interface RegistrationRecoveryEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly registrationReference: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
  readonly delegateType?: "PROFESSIONAL" | "STUDENT" | undefined;
  readonly paymentStatus?: "FAILED" | "ABANDONED" | undefined;
}

export interface RegistrationAdminNotificationEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly registrationReference: string;
  readonly delegateName: string;
  readonly delegateType: "PROFESSIONAL" | "STUDENT";
  readonly companyName: string;
  readonly country: string;
  readonly submittedAt: Date;
}

export interface PaymentConfirmationEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly registrationReference: string;
  readonly paymentReference: string;
  readonly packageName: string;
  readonly delegateCategory?: "Professional Delegate" | "Student Delegate";
  readonly currency: string;
  readonly amountMinor: number;
  readonly eventPassQrBase64: string;
}

export interface AdminPaymentNotificationEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly delegateName: string;
  readonly delegateEmail: string;
  readonly registrationReference: string;
  readonly paymentReference: string;
  readonly packageName: string;
  readonly delegateCategory?: "Professional Delegate" | "Student Delegate";
  readonly currency: string;
  readonly amountMinor: number;
  readonly confirmedAt: Date;
}

export interface PaymentReconciliationAlertEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly delegateName: string;
  readonly registrationReference: string;
  readonly paymentReference: string;
  readonly currency: string;
  readonly amountMinor: number;
  readonly paymentStatus: string;
  readonly reason: string;
}

export interface StudentRecoveryEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly registrationReference: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
}

export interface StudentVerificationEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly registrationReference: string;
  readonly notificationType:
    | "SUBMITTED"
    | "RESUBMITTED"
    | "MORE_INFORMATION_REQUIRED"
    | "APPROVED"
    | "REJECTED";
  readonly reason: string | null;
}

export interface CommercialApplicationEmailInput {
  readonly kind: "SPONSOR" | "EXHIBITOR";
  readonly email: string;
  readonly fullName: string;
  readonly organizationName: string;
  readonly reference: string;
  readonly packageName: string;
  readonly currency: "USD";
  readonly priceMinor: number;
  readonly notificationType:
    "SUBMITTED" | "MORE_INFORMATION_REQUIRED" | "CONFIRMED" | "DECLINED";
  readonly applicantReason: string | null;
}

export interface AbstractNotificationEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly reference: string;
  readonly title: string;
  readonly notificationType:
    "SUBMITTED" | "REVISION_REQUIRED" | "RESUBMITTED" | "ACCEPTED" | "REJECTED";
  readonly authorVisibleReason: string | null;
  readonly recoveryToken?: string;
}

export interface AbstractRecoveryEmailInput {
  readonly email: string;
  readonly fullName: string;
  readonly reference: string;
  readonly title: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
}

export interface EnquiryNotificationEmailInput {
  readonly email: string;
  readonly name: string;
  readonly recipientKind: "ACKNOWLEDGEMENT" | "INTERNAL";
  readonly reference: string;
  readonly category: string;
  readonly subject: string;
  readonly sender: string;
  readonly submittedAt: Date;
}
