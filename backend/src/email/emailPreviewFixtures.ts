/** Synthetic fixtures only: no database, provider calls, or usable tokens. */
import { emailVerificationTemplate } from "./templates/emailVerification.template";
import { adminInvitationTemplate } from "./templates/adminInvitation.template";
import {
  abstractSubmissionTemplate,
  abstractRecoveryTemplate,
} from "./templates/abstractSubmission.template";
import { commercialApplicationTemplate } from "./templates/commercialApplication.template";
import { enquiryTemplate } from "./templates/enquiry.template";
import {
  studentVerificationTemplate,
  studentRecoveryTemplate,
} from "./templates/studentVerification.template";
import {
  registrationRecoveryTemplate,
  registrationAdminNotificationTemplate,
} from "./templates/registrationRecovery.template";
import { paymentReconciliationAlertTemplate } from "./templates/paymentReconciliationAlert.template";
import { communicationTemplate } from "./templates/communication.template";

export function emailPreviewFixtures() {
  const fullName = "Ada Example";
  const registrationReference = "AIAIAC-DEL-PREVIEW1";
  const email = "ada@example.invalid";
  const expiresAt = new Date("2026-10-09T12:00:00.000Z");
  const base = "https://preview.example.invalid";
  const fixtures = [
    {
      name: "email-verification",
      ...emailVerificationTemplate({
        fullName,
        registrationReference,
        verificationUrl: `${base}/registration/verify-email#token=PREVIEW-ONLY`,
        expiresAt,
      }),
    },
    {
      name: "admin-invitation",
      ...adminInvitationTemplate({
        fullName,
        role: "ADMIN",
        invitationUrl: `${base}/admin/accept-invite?token=PREVIEW-ONLY`,
        expiresAt,
      }),
    },
    {
      name: "registration-recovery",
      ...registrationRecoveryTemplate({
        fullName,
        registrationReference,
        recoveryUrl: `${base}/registration/continue#recoveryToken=PREVIEW-ONLY`,
        expiresAt,
      }),
    },
    {
      name: "payment-recovery",
      ...registrationRecoveryTemplate({
        fullName,
        registrationReference,
        recoveryUrl: `${base}/registration/continue#recoveryToken=PREVIEW-ONLY`,
        expiresAt,
        delegateType: "PROFESSIONAL",
        paymentStatus: "FAILED",
      }),
    },
    {
      name: "abstract-recovery",
      ...abstractRecoveryTemplate({
        fullName,
        reference: "AIAIAC-ABS-PREVIEW1",
        title: "Synthetic preview abstract",
        recoveryUrl: `${base}/registration/abstract#token=PREVIEW-ONLY`,
        expiresAt,
      }),
    },
    {
      name: "student-recovery",
      ...studentRecoveryTemplate({
        fullName,
        registrationReference,
        recoveryUrl: `${base}/registration/student-verification#token=PREVIEW-ONLY`,
        expiresAt,
      }),
    },
    {
      name: "registration-admin-notification",
      ...registrationAdminNotificationTemplate({
        registrationReference,
        delegateName: fullName,
        delegateType: "PROFESSIONAL",
        companyName: "Example organization",
        country: "Nigeria",
        submittedAt: expiresAt,
      }),
    },
    {
      name: "payment-reconciliation",
      ...paymentReconciliationAlertTemplate({
        email,
        fullName,
        delegateName: fullName,
        registrationReference,
        paymentReference: "AIAIAC-PAY-PREVIEWONLY",
        currency: "NGN",
        amountMinor: 210000000,
        paymentStatus: "FAILED",
        reason: "Synthetic reconciliation preview",
      }),
    },
    {
      name: "conference-communication",
      ...communicationTemplate({
        title: "Synthetic preview",
        audience: { code: "ALL_DELEGATES" },
        subject: "Preview conference update",
        preheader: "Synthetic preview only",
        heading: "Conference update",
        body: "This is a synthetic layout preview, not a conference announcement.",
        ctaLabel: "View conference",
        ctaUrl: base,
      }),
    },
  ];
  for (const notificationType of [
    "SUBMITTED",
    "RESUBMITTED",
    "REVISION_REQUIRED",
    "ACCEPTED",
    "REJECTED",
  ] as const) {
    fixtures.push({
      name: `abstract-${notificationType.toLowerCase()}`,
      ...abstractSubmissionTemplate(
        {
          email,
          fullName,
          reference: "AIAIAC-ABS-PREVIEW1",
          title: "Synthetic preview abstract",
          notificationType,
          authorVisibleReason: "Synthetic preview instructions",
        },
        `${base}/registration/abstract#token=PREVIEW-ONLY`,
      ),
    });
  }
  for (const kind of ["SPONSOR", "EXHIBITOR"] as const)
    for (const notificationType of [
      "SUBMITTED",
      "MORE_INFORMATION_REQUIRED",
      "CONFIRMED",
      "DECLINED",
    ] as const) {
      fixtures.push({
        name: `${kind.toLowerCase()}-${notificationType.toLowerCase()}`,
        ...commercialApplicationTemplate({
          kind,
          email,
          fullName,
          organizationName: "Example organization",
          reference: "AIAIAC-APP-PREVIEW1",
          packageName: "Synthetic preview package",
          currency: "USD",
          priceMinor: 100000,
          notificationType,
          applicantReason: "Synthetic preview instructions",
        }),
      });
    }
  for (const notificationType of [
    "SUBMITTED",
    "RESUBMITTED",
    "MORE_INFORMATION_REQUIRED",
    "APPROVED",
    "REJECTED",
  ] as const) {
    fixtures.push({
      name: `student-${notificationType.toLowerCase()}`,
      ...studentVerificationTemplate(
        {
          email,
          fullName,
          registrationReference,
          notificationType,
          reason: "Synthetic preview instructions",
        },
        `${base}/registration/student-verification`,
      ),
    });
  }
  for (const recipientKind of ["ACKNOWLEDGEMENT", "INTERNAL"] as const) {
    fixtures.push({
      name: `enquiry-${recipientKind.toLowerCase()}`,
      ...enquiryTemplate({
        email,
        name: fullName,
        recipientKind,
        reference: "AIAIAC-ENQ-PREVIEW1",
        category: "GENERAL",
        subject: "Synthetic preview enquiry",
        sender: fullName,
        submittedAt: expiresAt,
      }),
    });
  }
  return fixtures;
}
