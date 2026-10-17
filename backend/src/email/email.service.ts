/**
 * Transactional email service
 *
 * Business services call this boundary rather than Mailjet directly. The raw
 * invitation token exists only long enough to build the recipient's URL.
 */

import type {
  AdminPaymentNotificationEmailInput,
  PaymentReconciliationAlertEmailInput,
  AdminInvitationEmailInput,
  EmailVerificationEmailInput,
  RegistrationRecoveryEmailInput,
  RegistrationAdminNotificationEmailInput,
  CommercialApplicationEmailInput,
  AbstractNotificationEmailInput,
  AbstractRecoveryEmailInput,
  EmailProvider,
  EnquiryNotificationEmailInput,
  EmailProviderAcceptance,
  PaymentConfirmationEmailInput,
  StudentRecoveryEmailInput,
  StudentVerificationEmailInput,
  TransactionalEmail,
} from "./email.types";
import { adminPaymentNotificationTemplate } from "./templates/adminPaymentNotification.template";
import { delegateRegistrationTemplate } from "./templates/delegateRegistration.template";
import { adminInvitationTemplate } from "./templates/adminInvitation.template";
import { emailVerificationTemplate } from "./templates/emailVerification.template";
import {
  registrationAdminNotificationTemplate,
  registrationRecoveryTemplate,
} from "./templates/registrationRecovery.template";
import { paymentConfirmationTemplate } from "./templates/paymentConfirmation.template";
import { paymentReconciliationAlertTemplate } from "./templates/paymentReconciliationAlert.template";
import { commercialApplicationTemplate } from "./templates/commercialApplication.template";
import { enquiryTemplate } from "./templates/enquiry.template";
import {
  abstractRecoveryTemplate,
  abstractSubmissionTemplate,
} from "./templates/abstractSubmission.template";
import {
  studentRecoveryTemplate,
  studentVerificationTemplate,
} from "./templates/studentVerification.template";

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Transactional email provider is not configured");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailService {
  constructor(
    private readonly provider: EmailProvider | null,
    private readonly adminFrontendUrl: string,
    private readonly publicFrontendUrl: string = adminFrontendUrl,
  ) {}

  get isConfigured(): boolean {
    return this.provider !== null;
  }

  /** Campaign delivery uses the same provider but never invokes transactional triggers. */
  async sendCommunication(
    message: TransactionalEmail,
  ): Promise<void | EmailProviderAcceptance> {
    if (!this.provider) throw new EmailNotConfiguredError();
    return this.provider.send(message);
  }

  async sendDelegateRegistrationAcknowledgement(input: {
    email: string;
    fullName: string;
    registrationReference: string;
  }): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...delegateRegistrationTemplate(input),
    });
  }

  async sendAdminInvitation(input: AdminInvitationEmailInput): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    const invitationUrl = new URL(
      "/admin/accept-invite",
      this.adminFrontendUrl,
    );
    invitationUrl.searchParams.set("token", input.rawToken);
    const content = adminInvitationTemplate({
      fullName: input.fullName,
      role: input.role,
      invitationUrl: invitationUrl.toString(),
      expiresAt: input.expiresAt,
    });
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...content,
    });
  }

  async sendEmailVerification(
    input: EmailVerificationEmailInput,
  ): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    const verificationUrl = new URL(
      "/registration/verify-email",
      this.publicFrontendUrl,
    );
    verificationUrl.hash = new URLSearchParams({ token: input.rawToken }).toString();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...emailVerificationTemplate({
        fullName: input.fullName,
        registrationReference: input.registrationReference,
        verificationUrl: verificationUrl.toString(),
        expiresAt: input.expiresAt,
      }),
    });
  }

  async sendRegistrationRecovery(
    input: RegistrationRecoveryEmailInput,
  ): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    const recoveryUrl = new URL("/registration/continue", this.publicFrontendUrl);
    recoveryUrl.hash = new URLSearchParams({ recoveryToken: input.rawToken }).toString();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...registrationRecoveryTemplate({
        fullName: input.fullName,
        registrationReference: input.registrationReference,
        recoveryUrl: recoveryUrl.toString(),
        expiresAt: input.expiresAt,
        delegateType: input.delegateType,
        paymentStatus: input.paymentStatus,
      }),
    });
  }

  async sendRegistrationAdminNotification(
    input: RegistrationAdminNotificationEmailInput,
  ): Promise<void | EmailProviderAcceptance> {
    if (!this.provider) throw new EmailNotConfiguredError();
    return this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...registrationAdminNotificationTemplate(input),
    });
  }

  async sendPaymentConfirmation(
    input: PaymentConfirmationEmailInput,
  ): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      inlineAttachments: [
        {
          contentType: "image/png",
          filename: "aiaiac-2027-event-pass.png",
          contentId: "aiaiac-event-pass-qr",
          base64Content: input.eventPassQrBase64,
        },
      ],
      ...paymentConfirmationTemplate(input),
    });
  }

  async sendAdminPaymentNotification(
    input: AdminPaymentNotificationEmailInput,
  ): Promise<void | EmailProviderAcceptance> {
    if (!this.provider) throw new EmailNotConfiguredError();
    return this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...adminPaymentNotificationTemplate(input),
    });
  }

  async sendPaymentReconciliationAlert(
    input: PaymentReconciliationAlertEmailInput,
  ): Promise<void | EmailProviderAcceptance> {
    if (!this.provider) throw new EmailNotConfiguredError();
    return this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...paymentReconciliationAlertTemplate(input),
    });
  }

  async sendStudentRecovery(input: StudentRecoveryEmailInput): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    const recoveryUrl = new URL(
      "/registration/student-verification",
      this.publicFrontendUrl,
    );
    recoveryUrl.hash = new URLSearchParams({
      recoveryToken: input.rawToken,
    }).toString();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...studentRecoveryTemplate({
        fullName: input.fullName,
        registrationReference: input.registrationReference,
        recoveryUrl: recoveryUrl.toString(),
        expiresAt: input.expiresAt,
      }),
    });
  }

  async sendStudentVerification(
    input: StudentVerificationEmailInput,
  ): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    const portalUrl = new URL(
      "/registration/student-verification",
      this.publicFrontendUrl,
    ).toString();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...studentVerificationTemplate(input, portalUrl),
    });
  }

  async sendCommercialApplication(
    input: CommercialApplicationEmailInput,
  ): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...commercialApplicationTemplate(input),
    });
  }

  async sendAbstractNotification(
    input: AbstractNotificationEmailInput,
  ): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    let workspaceUrl: string | undefined;
    if (input.recoveryToken) {
      const url = new URL("/registration/abstract", this.publicFrontendUrl);
      url.hash = new URLSearchParams({
        recoveryToken: input.recoveryToken,
      }).toString();
      workspaceUrl = url.toString();
    }
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...abstractSubmissionTemplate(input, workspaceUrl),
    });
  }

  async sendAbstractRecovery(input: AbstractRecoveryEmailInput): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    const url = new URL("/registration/abstract", this.publicFrontendUrl);
    url.hash = new URLSearchParams({
      recoveryToken: input.rawToken,
    }).toString();
    await this.provider.send({
      toEmail: input.email,
      toName: input.fullName,
      ...abstractRecoveryTemplate({
        fullName: input.fullName,
        reference: input.reference,
        title: input.title,
        recoveryUrl: url.toString(),
        expiresAt: input.expiresAt,
      }),
    });
  }

  async sendEnquiryNotification(
    input: EnquiryNotificationEmailInput,
  ): Promise<void> {
    if (!this.provider) throw new EmailNotConfiguredError();
    await this.provider.send({
      toEmail: input.email,
      toName: input.name,
      ...enquiryTemplate(input),
    });
  }
}
