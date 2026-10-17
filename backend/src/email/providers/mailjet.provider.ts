/**
 * Mailjet transactional provider
 *
 * Converts provider-neutral messages to Mailjet Send API requests. Failure
 * details and credentials are intentionally not exposed to callers or logs.
 */

import { z } from "zod";
import type {
  EmailProvider,
  EmailProviderAcceptance,
  TransactionalEmail,
} from "../email.types";

const sendResponseSchema = z.object({
  Messages: z
    .array(
      z.object({
        Status: z.literal("success"),
        To: z
          .array(
            z.object({
              Email: z.email(),
              MessageUUID: z.uuid(),
              MessageHref: z.string().optional(),
            }),
          )
          .length(1),
      }),
    )
    .length(1),
});

interface MailjetProviderOptions {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly fromEmail: string;
  readonly fromName: string;
  readonly fetchImplementation?: typeof fetch;
}

export class MailjetDeliveryError extends Error {
  constructor(readonly outcome: "REJECTED" | "UNKNOWN" = "UNKNOWN") {
    super("Transactional email delivery failed");
    this.name = "MailjetDeliveryError";
  }
}

export class MailjetProvider implements EmailProvider {
  private readonly request: typeof fetch;

  constructor(private readonly options: MailjetProviderOptions) {
    this.request = options.fetchImplementation ?? fetch;
  }

  async send(message: TransactionalEmail): Promise<EmailProviderAcceptance> {
    let response: Response;
    try {
      response = await this.request("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.options.apiKey}:${this.options.secretKey}`,
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: this.options.fromEmail,
                Name: this.options.fromName,
              },
              To: [{ Email: message.toEmail, Name: message.toName }],
              Subject: message.subject,
              ...(message.communicationDeliveryId
                ? {
                    CustomID: `AIAIAC-COM-DEL:${message.communicationDeliveryId}`,
                  }
                : {}),
              TextPart: message.text,
              HTMLPart: message.html,
              ...(message.unsubscribeUrl
                ? {
                    Headers: {
                      "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
                      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                    },
                  }
                : {}),
              ...(message.inlineAttachments?.length
                ? {
                    InlinedAttachments: message.inlineAttachments.map(
                      (attachment) => ({
                        ContentType: attachment.contentType,
                        Filename: attachment.filename,
                        ContentID: attachment.contentId,
                        Base64Content: attachment.base64Content,
                      }),
                    ),
                  }
                : {}),
            },
          ],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new MailjetDeliveryError();
    }

    if (!response.ok)
      throw new MailjetDeliveryError(
        response.status >= 400 &&
          response.status < 500 &&
          response.status !== 408
          ? "REJECTED"
          : "UNKNOWN",
      );
    try {
      const body: unknown = await response.json();
      const parsed = sendResponseSchema.safeParse(body);
      if (!parsed.success) throw new MailjetDeliveryError();
      const recipient = parsed.data.Messages[0]!.To[0]!;
      if (recipient.Email.toLowerCase() !== message.toEmail.toLowerCase()) {
        throw new MailjetDeliveryError();
      }
      return {
        provider: "MAILJET",
        status: "accepted",
        messageUuid: recipient.MessageUUID,
        messageId: recipient.MessageHref?.match(/\/(\d+)$/)?.[1] ?? null,
      };
    } catch {
      throw new MailjetDeliveryError();
    }
  }
}
