import assert from "node:assert/strict";
import test from "node:test";
import { EmailService } from "../src/email/email.service";
import { renderEventPassQrBase64 } from "../src/eventPass/eventPassCredential";
import {
  MailjetDeliveryError,
  MailjetProvider,
} from "../src/email/providers/mailjet.provider";

const message = {
  toEmail: "jane@example.com",
  toName: "Jane Doe",
  subject: "Invitation",
  text: "Use the invitation link",
  html: "<p>Use the invitation link</p>",
};

const acceptedResponse = {
  Messages: [
    {
      Status: "success",
      To: [
        {
          Email: "jane@example.com",
          MessageUUID: "3e1dc5ee-3943-4e3c-b78f-adbb31cde539",
          MessageHref: "https://api.mailjet.com/v3/message/576460792599048572",
        },
      ],
    },
  ],
};

test("Mailjet provider sends the expected transactional request without logging credentials", async () => {
  let requestUrl = "";
  let requestOptions: RequestInit | undefined;
  const provider = new MailjetProvider({
    apiKey: "test-api-key",
    secretKey: "test-secret-key",
    fromEmail: "no-reply@example.com",
    fromName: "AIAIAC",
    fetchImplementation: (async (url, options) => {
      requestUrl = String(url);
      requestOptions = options;
      return new Response(JSON.stringify(acceptedResponse), { status: 200 });
    }) as typeof fetch,
  });

  const acceptance = await provider.send(message);

  assert.deepEqual(acceptance, {
    provider: "MAILJET",
    status: "accepted",
    messageUuid: "3e1dc5ee-3943-4e3c-b78f-adbb31cde539",
    messageId: "576460792599048572",
  });

  assert.equal(requestUrl, "https://api.mailjet.com/v3.1/send");
  const body = JSON.parse(String(requestOptions?.body));
  assert.deepEqual(body.Messages[0].To[0], {
    Email: "jane@example.com",
    Name: "Jane Doe",
  });
  assert.deepEqual(body.Messages[0].From, {
    Email: "no-reply@example.com",
    Name: "AIAIAC",
  });
  assert.equal(body.Messages[0].Subject, "Invitation");
  assert.match(
    new Headers(requestOptions?.headers).get("Authorization") ?? "",
    /^Basic /,
  );
  assert.equal(JSON.stringify(body).includes("test-secret-key"), false);
});

test("Mailjet failures become a provider-neutral safe error", async () => {
  const provider = new MailjetProvider({
    apiKey: "test-api-key",
    secretKey: "test-secret-key",
    fromEmail: "no-reply@example.com",
    fromName: "AIAIAC",
    fetchImplementation: (async () =>
      new Response("provider detail", { status: 503 })) as typeof fetch,
  });

  await assert.rejects(provider.send(message), MailjetDeliveryError);
});

test("Mailjet maps an event-pass QR to a content-ID inline attachment", async () => {
  let requestOptions: RequestInit | undefined;
  const provider = new MailjetProvider({
    apiKey: "test-api-key",
    secretKey: "test-secret-key",
    fromEmail: "no-reply@example.com",
    fromName: "AIAIAC",
    fetchImplementation: (async (_url, options) => {
      requestOptions = options;
      return new Response(JSON.stringify(acceptedResponse), { status: 200 });
    }) as typeof fetch,
  });
  await provider.send({
    ...message,
    inlineAttachments: [
      {
        contentType: "image/png",
        filename: "event-pass.png",
        contentId: "event-pass-qr",
        base64Content: "cG5n",
      },
    ],
  });
  const body = JSON.parse(String(requestOptions?.body));
  assert.deepEqual(body.Messages[0].InlinedAttachments, [
    {
      ContentType: "image/png",
      Filename: "event-pass.png",
      ContentID: "event-pass-qr",
      Base64Content: "cG5n",
    },
  ]);
});

test("payment confirmation sends a matching CID and PNG through Mailjet", async () => {
  let requestOptions: RequestInit | undefined;
  const provider = new MailjetProvider({
    apiKey: "test-api-key",
    secretKey: "test-secret-key",
    fromEmail: "no-reply@example.com",
    fromName: "AIAIAC",
    fetchImplementation: (async (_url, options) => {
      requestOptions = options;
      return new Response(JSON.stringify(acceptedResponse), { status: 200 });
    }) as typeof fetch,
  });
  const raw = "PREVIEW-ONLY-NOT-A-VALID-EVENT-PASS";
  const qr = await renderEventPassQrBase64(raw);
  await new EmailService(provider, "http://localhost:5173").sendPaymentConfirmation({
    email: "jane@example.com",
    fullName: "Jane Doe",
    registrationReference: "AIAIAC-DEL-ABCD2345",
    paymentReference: "AIAIAC-PAY-1234567890ABCDEFGHIJKLMN",
    packageName: "Professional Delegate",
    currency: "NGN",
    amountMinor: 210000000,
    eventPassQrBase64: qr,
  });

  const sent = JSON.parse(String(requestOptions?.body)).Messages[0];
  const [attachment] = sent.InlinedAttachments;
  assert.equal(sent.Attachments, undefined);
  assert.equal(attachment.ContentType, "image/png");
  assert.match(attachment.Filename, /\.png$/);
  assert.equal(attachment.Base64Content, qr);
  assert.ok(
    Buffer.from(attachment.Base64Content, "base64")
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  );
  assert.ok(sent.HTMLPart.includes(`src="cid:${attachment.ContentID}"`));
  assert.ok(!sent.TextPart.includes("cid:"));
  assert.ok(!sent.TextPart.includes(qr));
  assert.ok(!sent.HTMLPart.includes(raw));
});

test("Mailjet per-message rejection is not recorded as successful delivery", async () => {
  const provider = new MailjetProvider({
    apiKey: "test-api-key",
    secretKey: "test-secret-key",
    fromEmail: "no-reply@example.com",
    fromName: "AIAIAC",
    fetchImplementation: (async () =>
      new Response(
        JSON.stringify({ Messages: [{ Status: "error", Errors: [] }] }),
        {
          status: 200,
        },
      )) as typeof fetch,
  });

  await assert.rejects(provider.send(message), MailjetDeliveryError);
});

test("Mailjet rejects a success response addressed to a different recipient", async () => {
  const provider = new MailjetProvider({
    apiKey: "test-api-key",
    secretKey: "test-secret-key",
    fromEmail: "no-reply@example.com",
    fromName: "AIAIAC",
    fetchImplementation: (async () =>
      new Response(
        JSON.stringify({
          Messages: [
            {
              Status: "success",
              To: [
                {
                  ...acceptedResponse.Messages[0]!.To[0]!,
                  Email: "other@example.com",
                },
              ],
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch,
  });

  await assert.rejects(provider.send(message), MailjetDeliveryError);
});
