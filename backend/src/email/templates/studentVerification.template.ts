import type { StudentVerificationEmailInput } from "../email.types";
import {
  aiaiacEmailLayout,
  emailCta,
  emailInformationRows,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

function content(input: StudentVerificationEmailInput) {
  switch (input.notificationType) {
    case "SUBMITTED":
      return {
        subject: "AIAIAC 2027 Student verification received",
        heading: "Your Student verification is under review",
        message:
          "We have received your Student Delegate verification submission. Review is pending. No payment is requested at this stage.",
      };
    case "RESUBMITTED":
      return {
        subject: "AIAIAC 2027 Student verification resubmitted",
        heading: "Your updated verification is under review",
        message:
          "We have received your updated Student Delegate verification submission. Review is pending again. No payment is requested at this stage.",
      };
    case "MORE_INFORMATION_REQUIRED":
      return {
        subject: "Action required for your AIAIAC 2027 Student verification",
        heading: "More information is required",
        message: `Please update your evidence using the secure Student verification portal. Instruction: ${input.reason ?? "Please review the request in the portal."}`,
      };
    case "APPROVED":
      return {
        subject: "AIAIAC 2027 Student eligibility verified",
        heading: "Your Student Delegate eligibility has been verified",
        message:
          "Your Student Delegate eligibility has been verified. If an active Student Delegate price has been confirmed, payment options are available in your secure verification portal. Otherwise, pricing and payment instructions will be made available once confirmed.",
      };
    case "REJECTED":
      return {
        subject: "AIAIAC 2027 Student verification decision",
        heading: "Student verification decision",
        message: `We are unable to verify your Student Delegate eligibility at this time. Reason: ${input.reason ?? "Please review the decision in the portal."}`,
      };
  }
}

export function studentVerificationTemplate(
  input: StudentVerificationEmailInput,
  portalUrl: string,
) {
  const selected = content(input);
  return {
    subject: selected.subject,
    text: [
      `Hello ${input.fullName},`,
      selected.message,
      `Registration reference: ${input.registrationReference}`,
      `Student verification portal: ${portalUrl}`,
      "AIAIAC 2027",
    ].join("\n\n"),
    html: aiaiacEmailLayout({
      title: selected.heading,
      preview: selected.message,
      bodyHtml: `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">${escapeEmailHtml(selected.heading)}</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p><p>${escapeEmailHtml(selected.message)}</p>${emailInformationRows([["Registration reference", input.registrationReference]])}${emailCta(portalUrl, "Open the secure Student verification portal")}`,
    }),
  };
}

export function studentRecoveryTemplate(input: {
  fullName: string;
  registrationReference: string;
  recoveryUrl: string;
  expiresAt: Date;
}) {
  const expires = input.expiresAt.toISOString();
  return {
    subject: "Restore access to your AIAIAC 2027 Student verification",
    text: [
      `Hello ${input.fullName},`,
      "Use the secure link below to restore access to your Student verification.",
      `Registration reference: ${input.registrationReference}`,
      input.recoveryUrl,
      `This single-use link expires at ${expires}.`,
      "If you did not request this email, you can ignore it.",
    ].join("\n\n"),
    html: aiaiacEmailLayout({
      title: "Restore Student verification access",
      preview:
        "Use your single-use link to restore secure Student verification access.",
      bodyHtml: `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">Restore Student verification access</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p><p>Use this single-use link to restore access to your Student verification.</p>${emailInformationRows([["Registration reference", input.registrationReference]])}${emailCta(input.recoveryUrl, "Restore secure access")}<p>This link expires at ${escapeEmailHtml(expires)}.</p><p>If you did not request this email, you can ignore it.</p>`,
    }),
  };
}
