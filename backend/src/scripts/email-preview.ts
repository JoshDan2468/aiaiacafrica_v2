/** Generate synthetic, browser-viewable previews without sending email or touching the database. */

import "dotenv/config";
import { emailPreviewFixtures } from "../email/emailPreviewFixtures";
import { escapeEmailHtml } from "../email/templates/aiaiacEmailLayout";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MailjetProvider } from "../email/providers/mailjet.provider";
import { adminPaymentNotificationTemplate } from "../email/templates/adminPaymentNotification.template";
import { delegateRegistrationTemplate } from "../email/templates/delegateRegistration.template";
import { paymentConfirmationTemplate } from "../email/templates/paymentConfirmation.template";
import { renderEventPassQrBase64 } from "../eventPass/eventPassCredential";

async function main(): Promise<void> {
  const output = resolve(process.cwd(), "email-previews");
  const registrationReference = "AIAIAC-DEL-PREVIEW1";
  const paymentReference = "AIAIAC-PAY-PREVIEWONLY00000000000000";
  const sample = {
    fullName: "Ada Example",
    registrationReference,
  };
  const acknowledgement = delegateRegistrationTemplate(sample);
  const confirmation = paymentConfirmationTemplate({
    email: "ada.example@example.invalid",
    ...sample,
    paymentReference,
    packageName: "Professional Delegate",
    currency: "NGN",
    amountMinor: 210000000,
    eventPassQrBase64: "",
  });
  const admin = adminPaymentNotificationTemplate({
    email: "admin.example@example.invalid",
    fullName: "Test Administrator",
    delegateName: sample.fullName,
    delegateEmail: "ada.example@example.invalid",
    registrationReference,
    paymentReference,
    packageName: "Professional Delegate",
    currency: "NGN",
    amountMinor: 210000000,
    confirmedAt: new Date("2026-09-25T12:00:00.000Z"),
  });
  const qr = await renderEventPassQrBase64(
    "PREVIEW-ONLY-NOT-A-VALID-EVENT-PASS",
  );
  const confirmationPreview = confirmation.html.replace(
    "cid:aiaiac-event-pass-qr",
    `data:image/png;base64,${qr}`,
  );
  await mkdir(output, { recursive: true });
  await mkdir(resolve(output, "brand"), { recursive: true });
  await copyFile(
    resolve(process.cwd(), "../frontend/public/brand/aiaiac-logo-light.png"),
    resolve(output, "brand/aiaiac-logo-light.png"),
  );
  const previews = [
    ["professional-registration.html", acknowledgement.html],
    ["professional-payment-event-pass.html", confirmationPreview],
    ["admin-payment-notification.html", admin.html],
    ...emailPreviewFixtures().map(
      (fixture) => [`${fixture.name}.html`, fixture.html] as const,
    ),
  ] as const;
  for (const [name, html] of previews) {
    await writeFile(
      resolve(output, name),
      html
        .replace(
          /src="[^"]*\/brand\/aiaiac-logo-light.png"/,
          'src="brand/aiaiac-logo-light.png"',
        )
        .replace(
          '<p style="margin:0;font-size:30px;font-weight:700;letter-spacing:4px;color:#05190F">AIAIAC</p>',
          '<img src="brand/aiaiac-logo-light.png" width="240" alt="AIAIAC" style="display:block;width:240px;max-width:100%;height:auto;border:0;margin:0 auto">',
        ),
      "utf8",
    );
  }
  await writeFile(
    resolve(output, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email previews</title></head><body style="font-family:Arial,sans-serif;padding:24px;background:#f1f4ef;color:#05190F"><h1>AIAIAC email previews</h1><p>Synthetic fixtures. Links and QR codes are not usable credentials.</p><ul>${previews.map(([name]) => `<li style="margin:12px 0"><a href="${name}">${escapeEmailHtml(name)}</a></li>`).join("")}</ul></body></html>`,
    "utf8",
  );
  console.log(`Synthetic email previews written to ${output}`);
  console.log(
    `Subjects: ${acknowledgement.subject} | ${confirmation.subject} | ${admin.subject}`,
  );
  if (process.argv.includes("--send-test")) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Test preview sending is disabled in production");
    const recipient =
      process.env.EMAIL_PREVIEW_TEST_RECIPIENT?.trim().toLowerCase();
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
      throw new Error(
        "EMAIL_PREVIEW_TEST_RECIPIENT must name an explicit test inbox",
      );
    const { MAILJET_API_KEY, MAILJET_SECRET_KEY, MAILJET_FROM_EMAIL } =
      process.env;
    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY || !MAILJET_FROM_EMAIL)
      throw new Error("Mailjet credentials and sender must be configured");
    const provider = new MailjetProvider({
      apiKey: MAILJET_API_KEY,
      secretKey: MAILJET_SECRET_KEY,
      fromEmail: MAILJET_FROM_EMAIL,
      fromName: process.env.MAILJET_FROM_NAME || "AIAIAC Africa 2027",
    });
    const acceptance = await provider.send({
      toEmail: recipient,
      toName: "AIAIAC Test Recipient",
      subject: `[TEST PREVIEW] ${confirmation.subject}`,
      text: confirmation.text,
      html: confirmation.html,
      inlineAttachments: [
        {
          contentType: "image/png",
          filename: "aiaiac-2027-event-pass-preview.png",
          contentId: "aiaiac-event-pass-qr",
          base64Content: qr,
        },
      ],
    });
    console.log(
      `MAILJET ACCEPTED: ${acceptance?.status === "accepted" ? "yes" : "provider returned without acceptance metadata"}. INBOX DELIVERY CONFIRMED: no.`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
