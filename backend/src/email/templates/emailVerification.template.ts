import {
  aiaiacEmailLayout,
  emailCta,
  emailInformationRows,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

interface EmailVerificationTemplateInput {
  readonly fullName: string;
  readonly registrationReference: string;
  readonly verificationUrl: string;
  readonly expiresAt: Date;
}
export function emailVerificationTemplate(
  input: EmailVerificationTemplateInput,
) {
  const expiry = input.expiresAt.toISOString();
  const subject = "Verify your email — AIAIAC Africa 2027";
  const text = [
    `Hello ${input.fullName},`,
    "Please verify that you own the email address used for your AIAIAC Africa 2027 registration.",
    `Registration reference: ${input.registrationReference}`,
    `Verify your email: ${input.verificationUrl}`,
    `This single-use link expires at ${expiry}.`,
    "If you did not make this registration, do not use the link. You can safely ignore this email.",
  ].join("\n\n");
  const bodyHtml = `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">Verify your email</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p><p>Please verify that you own the email address used for your AIAIAC Africa 2027 registration.</p>${emailInformationRows(
    [["Registration reference", input.registrationReference]],
  )}${emailCta(input.verificationUrl, "Verify email address")}<p>This single-use link expires at <strong>${escapeEmailHtml(expiry)}</strong>.</p><p style="color:#405a4c">If you did not make this registration, do not use the link. You can safely ignore this email.</p>`;
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: "Verify your email",
      preview:
        "Verify the email address used for your AIAIAC Africa 2027 registration.",
      bodyHtml,
    }),
  };
}
