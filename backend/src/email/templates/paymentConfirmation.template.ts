import { eventPassTicket } from "./eventPass.template";
import type { PaymentConfirmationEmailInput } from "../email.types";
import {
  aiaiacEmailLayout,
  emailInformationRows,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

export function paymentConfirmationTemplate(
  input: PaymentConfirmationEmailInput,
) {
  const amount = new Intl.NumberFormat(
    input.currency === "NGN" ? "en-NG" : "en-US",
    {
      style: "currency",
      currency: input.currency,
    },
  ).format(input.amountMinor / 100);
  const category = input.delegateCategory ?? "Professional Delegate";
  const subject = "Payment Confirmed — Your AIAIAC Africa 2027 Event Pass";
  const text = [
    `Hello ${input.fullName},`,
    "PAYMENT CONFIRMED",
    `Your ${category} payment for AIAIAC Africa 2027 is confirmed.`,
    "Event: 22–23 June 2027, Lagos, Nigeria",
    `Delegate: ${input.fullName}`,
    `Registration reference: ${input.registrationReference}`,
    `Category: ${category}`,
    `Payment reference: ${input.paymentReference}`,
    `Amount: ${amount} (${input.currency})`,
    "Your QR Event Pass is included in the HTML version of this email. Retain this email and present the QR for event access/check-in. If you cannot view the QR, contact the organiser with your registration reference.",
  ].join("\n\n");
  const bodyHtml = `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">Payment confirmed</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p><p>Your ${escapeEmailHtml(category)} payment for AIAIAC Africa 2027 has been confirmed. Your Event Pass is ready for the Conference &amp; Innovation Showcase on <strong>22–23 June 2027 in Lagos, Nigeria</strong>.</p>${emailInformationRows(
    [
      ["Delegate", input.fullName],
      ["Registration reference", input.registrationReference],
      ["Category", category],
      ["Payment reference", input.paymentReference],
      ["Amount paid", `${amount} (${input.currency})`],
    ],
  )}<h2 style="margin:30px 0 10px;font-size:19px">Your Event Pass</h2><p style="margin:0 0 16px;color:#405a4c">Retain this email and present the QR code for event access/check-in.</p>${eventPassTicket({ fullName: input.fullName, registrationReference: input.registrationReference, category })}<p style="font-size:13px;color:#405a4c">If the QR image is unavailable, contact the organiser with your registration reference.</p>`;
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: "Payment confirmed and Event Pass",
      preview: `Your ${category} payment is confirmed and your QR Event Pass is ready.`,
      bodyHtml,
    }),
  };
}
