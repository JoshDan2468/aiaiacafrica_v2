import {
  aiaiacEmailLayout,
  emailCta,
  emailInformationRows,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

export function registrationRecoveryTemplate(input: {
  fullName: string;
  registrationReference: string;
  recoveryUrl: string;
  expiresAt: Date;
  delegateType?: "PROFESSIONAL" | "STUDENT" | undefined;
  paymentStatus?: "FAILED" | "ABANDONED" | undefined;
}) {
  const expiry = input.expiresAt.toISOString();
  const isPaymentRecovery = Boolean(input.paymentStatus && input.delegateType);
  const category =
    input.delegateType === "STUDENT"
      ? "Student Delegate"
      : "Professional Delegate";
  const paymentCopy =
    input.paymentStatus === "ABANDONED"
      ? "Your previous checkout was not completed. At the time of this message, no payment had been confirmed. Check the current status before trying again."
      : "Your previous payment attempt was not completed. At the time of this message, no payment had been confirmed. Check the current status before trying again.";
  const subject = isPaymentRecovery
    ? "Check or Retry Your AIAIAC Africa 2027 Payment"
    : "Continue your registration — AIAIAC Africa 2027";
  const text = [
    `Hello ${input.fullName},`,
    ...(isPaymentRecovery
      ? [
          "Your AIAIAC Africa 2027 registration has been saved. You do not need to register again.",
          paymentCopy,
          `Delegate category: ${category}`,
        ]
      : [
          "Use this secure link to continue your existing registration. Do not submit a second registration.",
        ]),
    `Registration reference: ${input.registrationReference}`,
    `${isPaymentRecovery ? "Check payment status or retry securely" : "Continue registration"}: ${input.recoveryUrl}`,
    `This single-use link expires at ${expiry}.`,
    isPaymentRecovery
      ? "If this was not your payment attempt, you can safely ignore this email."
      : "If you did not request this link, you can safely ignore this email.",
  ].join("\n\n");
  const intro = isPaymentRecovery
    ? `<p>Your AIAIAC Africa 2027 registration has been saved. You do not need to register again.</p><p>${escapeEmailHtml(paymentCopy)}</p>`
    : "<p>Use this secure link to continue your existing registration. Do not submit a second registration.</p>";
  const details: Array<[string, string]> = [
    ["Registration reference", input.registrationReference],
  ];
  if (isPaymentRecovery) details.push(["Delegate category", category]);
  const actionLabel = isPaymentRecovery
    ? "Check Payment or Retry"
    : "Continue registration";
  const bodyHtml = `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">${isPaymentRecovery ? "Complete your registration" : "Continue your registration"}</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p>${intro}${emailInformationRows(
    details,
  )}${emailCta(input.recoveryUrl, actionLabel)}<p>This single-use link expires at <strong>${escapeEmailHtml(expiry)}</strong>.</p><p style="color:#405a4c">${isPaymentRecovery ? "If this was not your payment attempt, you can safely ignore this email." : "If you did not request this link, you can safely ignore this email."}</p>`;
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: isPaymentRecovery
        ? "Complete your registration"
        : "Continue registration",
      preview: isPaymentRecovery
        ? "Your registration is saved. Securely check the payment status or try again."
        : "Securely return to your existing AIAIAC Africa 2027 registration.",
      bodyHtml,
    }),
  };
}

export function registrationAdminNotificationTemplate(input: {
  registrationReference: string;
  delegateName: string;
  delegateType: "PROFESSIONAL" | "STUDENT";
  companyName: string;
  country: string;
  submittedAt: Date;
}) {
  const category =
    input.delegateType === "STUDENT"
      ? "Student Delegate"
      : "Professional Delegate";
  const subject = `New ${category} registration — ${input.registrationReference}`;
  const text = [
    "A new delegate registration has been persisted.",
    `Reference: ${input.registrationReference}`,
    `Delegate: ${input.delegateName}`,
    `Category: ${category}`,
    `Organisation: ${input.companyName}`,
    `Country: ${input.country}`,
    `Submitted: ${input.submittedAt.toISOString()}`,
    "Review it in the authenticated Admin workspace.",
  ].join("\n\n");
  const bodyHtml = `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">New delegate registration</h1><p>A new delegate registration has been persisted.</p>${emailInformationRows(
    [
      ["Reference", input.registrationReference],
      ["Delegate", input.delegateName],
      ["Category", category],
      ["Organisation", input.companyName],
      ["Country", input.country],
      ["Submitted", input.submittedAt.toISOString()],
    ],
  )}<p>Review it in the authenticated Admin workspace.</p>`;
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: "New delegate registration",
      preview: `${category} registration ${input.registrationReference} was received.`,
      bodyHtml,
    }),
  };
}
