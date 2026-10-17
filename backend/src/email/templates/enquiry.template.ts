import { aiaiacEmailLayout } from "./aiaiacEmailLayout";
import type { EnquiryNotificationEmailInput } from "../email.types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function enquiryTemplate(input: EnquiryNotificationEmailInput) {
  const internal = input.recipientKind === "INTERNAL";
  const subject = internal
    ? `AIAIAC 2027 new enquiry · ${input.reference}`
    : "AIAIAC 2027 enquiry received";
  const heading = internal
    ? "New enquiry for review"
    : "We received your enquiry";
  const intro = internal
    ? "A new public enquiry is available in the protected Admin workspace."
    : "Thank you for contacting AIAIAC 2027. Your enquiry has been received by our team.";
  const details = [
    `Reference: ${input.reference}`,
    `Category: ${input.category.replaceAll("_", " ")}`,
    `Subject: ${input.subject}`,
    ...(internal
      ? [
          `Submitter: ${input.sender}`,
          `Submitted: ${input.submittedAt.toISOString()}`,
        ]
      : []),
  ];
  return {
    subject,
    text: [
      `Hello ${input.name},`,
      intro,
      ...details,
      "AIAIAC 2027 · 22–23 June 2027 · Lagos, Nigeria",
    ].join("\n\n"),
    html: aiaiacEmailLayout({
      title: heading,
      preview: heading,
      bodyHtml: `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">${escapeHtml(heading)}</h1><p>Hello ${escapeHtml(input.name)},</p><p>${escapeHtml(intro)}</p><p>${details.map((line) => escapeHtml(line)).join("<br>")}</p><p>AIAIAC 2027 · 22–23 June 2027 · Lagos, Nigeria</p>`,
    }),
  };
}
