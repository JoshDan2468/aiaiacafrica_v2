import { aiaiacEmailLayout } from "./aiaiacEmailLayout";
import type { CommercialApplicationEmailInput } from "../email.types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAmount(input: CommercialApplicationEmailInput): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.currency,
    maximumFractionDigits: 0,
  }).format(input.priceMinor / 100);
}

function message(input: CommercialApplicationEmailInput): {
  subject: string;
  heading: string;
  body: string;
} {
  const category = input.kind === "SPONSOR" ? "sponsorship" : "exhibition";
  switch (input.notificationType) {
    case "SUBMITTED":
      return {
        subject: `AIAIAC 2027 ${category} application received`,
        heading: "Thank you for your interest in AIAIAC 2027",
        body: `We have received your ${category} application. Our team will review it and contact you. This submission does not mean payment has been completed.`,
      };
    case "CONFIRMED":
      return {
        subject: `AIAIAC 2027 ${category} application confirmed`,
        heading: "Your application is confirmed",
        body: "Your application has been confirmed. Commercial, payment, or invoice instructions will follow through the appropriate business process. Confirmation does not mean payment has been completed.",
      };
    case "MORE_INFORMATION_REQUIRED":
      return {
        subject: `More information required for your AIAIAC 2027 ${category} application`,
        heading: "More information is required",
        body: `Please respond to our team with the requested information. Instruction: ${input.applicantReason ?? "Please contact the AIAIAC team."}`,
      };
    case "DECLINED":
      return {
        subject: `AIAIAC 2027 ${category} application decision`,
        heading: "Application decision",
        body: `We are unable to confirm this application at this time. Reason: ${input.applicantReason ?? "Please contact the AIAIAC team."}`,
      };
  }
}

export function commercialApplicationTemplate(
  input: CommercialApplicationEmailInput,
) {
  const selected = message(input);
  const lines = [
    `Hello ${input.fullName},`,
    selected.body,
    `Organization: ${input.organizationName}`,
    `Application reference: ${input.reference}`,
    `Selected package: ${input.packageName}`,
    `Published value: ${formatAmount(input)}`,
    `Status: ${input.notificationType}`,
    "AIAIAC 2027",
  ];
  return {
    subject: selected.subject,
    text: lines.join("\n\n"),
    html: aiaiacEmailLayout({
      title: selected.heading,
      preview: selected.heading,
      bodyHtml: `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">${escapeHtml(selected.heading)}</h1><p>Hello ${escapeHtml(input.fullName)},</p><p>${escapeHtml(selected.body)}</p><p><strong>Organization:</strong> ${escapeHtml(input.organizationName)}<br><strong>Application reference:</strong> ${escapeHtml(input.reference)}<br><strong>Selected package:</strong> ${escapeHtml(input.packageName)}<br><strong>Published value:</strong> ${escapeHtml(formatAmount(input))}<br><strong>Status:</strong> ${escapeHtml(input.notificationType)}</p>`,
    }),
  };
}
