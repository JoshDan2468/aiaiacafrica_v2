import {
  aiaiacEmailLayout,
  emailInformationRows,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

export function delegateRegistrationTemplate(input: {
  fullName: string;
  registrationReference: string;
}) {
  const subject = "Registration Received — AIAIAC Africa 2027";
  const text = [
    `Hello ${input.fullName},`,
    "We have received your Professional Delegate registration for AIAIAC Africa 2027.",
    `Registration reference: ${input.registrationReference}`,
    "Category: Professional Delegate",
    "Next step: use the separate verification email to confirm that you own your email address.",
    "Your registration remains incomplete until email ownership is verified.",
    "Payment is not confirmed until AIAIAC records an authoritative successful payment. No Event Pass or QR code is issued before then.",
    "To return later, use Continue registration on the Delegate Registration page. We will email a secure access link.",
    "AIAIAC Africa 2027 · 22–23 June 2027 · Lagos, Nigeria",
  ].join("\n\n");
  const bodyHtml = `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">Registration received</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p><p>We have received your Professional Delegate registration for AIAIAC Africa 2027.</p>${emailInformationRows(
    [
      ["Registration reference", input.registrationReference],
      ["Category", "Professional Delegate"],
    ],
  )}<p><strong>Next step:</strong> Use the separate verification email to confirm that you own your email address.</p><p>Your registration remains incomplete until email ownership is verified. Payment is not confirmed until AIAIAC records an authoritative successful payment. No Event Pass or QR code is issued before then.</p><p style="color:#405a4c">To return later, use <strong>Continue registration</strong> on the Delegate Registration page. We will email a secure access link.</p>`;
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: "Registration received",
      preview:
        "Your Professional Delegate registration is received; email verification is the next step.",
      bodyHtml,
    }),
  };
}
