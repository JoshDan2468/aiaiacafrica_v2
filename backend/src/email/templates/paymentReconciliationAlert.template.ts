import type { PaymentReconciliationAlertEmailInput } from "../email.types";
import {
  aiaiacEmailLayout,
  emailInformationRows,
  escapeEmailHtml,
} from "./aiaiacEmailLayout";

export function paymentReconciliationAlertTemplate(
  input: PaymentReconciliationAlertEmailInput,
) {
  const amount = new Intl.NumberFormat(
    input.currency === "NGN" ? "en-NG" : "en-US",
    { style: "currency", currency: input.currency },
  ).format(input.amountMinor / 100);
  const subject = `Payment reconciliation required — ${input.registrationReference}`;
  const text = [
    `Hello ${input.fullName},`,
    "PAYMENT RECONCILIATION REQUIRED",
    `Delegate: ${input.delegateName}`,
    `Registration reference: ${input.registrationReference}`,
    `Payment reference: ${input.paymentReference}`,
    `Amount: ${amount} (${input.currency})`,
    `State: ${input.paymentStatus}`,
    `Reason: ${input.reason}`,
    "Review the protected Finance / Payments record. No refund or pass revocation has been performed automatically.",
  ].join("\n\n");
  const bodyHtml = `<h1 style="margin:0 0 18px;font-size:25px;line-height:1.3">Payment reconciliation required</h1><p>Hello ${escapeEmailHtml(input.fullName)},</p><p>A payment needs Finance review.</p>${emailInformationRows(
    [
      ["Delegate", input.delegateName],
      ["Registration reference", input.registrationReference],
      ["Payment reference", input.paymentReference],
      ["Amount", `${amount} (${input.currency})`],
      ["State", input.paymentStatus],
      ["Reason", input.reason],
    ],
  )}<p>Review the protected Finance / Payments record. No refund or pass revocation has been performed automatically.</p>`;
  return {
    subject,
    text,
    html: aiaiacEmailLayout({
      title: "Payment reconciliation required",
      preview: `Finance review required for ${input.registrationReference}.`,
      bodyHtml,
    }),
  };
}
