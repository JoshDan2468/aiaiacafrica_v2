import type { AdminPaymentNotificationEmailInput } from "../email.types";
import {
  aiaiacEmailLayout,
  emailInformationRows,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

export function adminPaymentNotificationTemplate(
  input: AdminPaymentNotificationEmailInput,
) {
  const amount = new Intl.NumberFormat(
    input.currency === "NGN" ? "en-NG" : "en-US",
    {
      style: "currency",
      currency: input.currency,
    },
  ).format(input.amountMinor / 100);
  const confirmedAt = input.confirmedAt.toISOString();
  const category = input.delegateCategory ?? "Professional Delegate";
  const subject = `Payment Received — ${input.registrationReference} — AIAIAC 2027`;
  const text = [
    `Hello ${input.fullName},`,
    "PAYMENT RECEIVED",
    `A ${category} payment has been confirmed.`,
    `Delegate: ${input.delegateName}`,
    `Delegate email: ${input.delegateEmail}`,
    `Registration reference: ${input.registrationReference}`,
    `Category: ${category}`,
    `Payment reference: ${input.paymentReference}`,
    `Amount: ${amount} (${input.currency})`,
    `Confirmed at: ${confirmedAt}`,
    "The authoritative record is available in the protected Admin workspace.",
  ].join("\n\n");
  const bodyHtml = `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">Payment received</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p><p>A ${escapeEmailHtml(category)} payment has been confirmed.</p>${emailInformationRows(
    [
      ["Delegate", input.delegateName],
      ["Delegate email", input.delegateEmail],
      ["Registration reference", input.registrationReference],
      ["Category", category],
      ["Payment reference", input.paymentReference],
      ["Amount received", `${amount} (${input.currency})`],
      ["Confirmed at", confirmedAt],
    ],
  )}<p>The authoritative record is available in the protected Admin workspace.</p>`;
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: "Professional Delegate payment received",
      preview: `Payment received for ${input.registrationReference}.`,
      bodyHtml,
    }),
  };
}
