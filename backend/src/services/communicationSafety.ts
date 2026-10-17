import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createPublicError } from "../middleware/error.middleware";

export const preferenceSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    consent: z.enum(["UNKNOWN", "OPTED_IN", "OPTED_OUT"]).optional(),
    evidence: z.string().trim().min(3).max(500).optional(),
    sourceLabel: z.string().trim().min(1).max(200).optional(),
    suppressed: z.boolean().optional(),
    reason: z.string().trim().min(3).max(200).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.consent === undefined && value.suppressed === undefined)
      ctx.addIssue({
        code: "custom",
        message: "Select a consent or suppression change",
      });
    if (
      (value.consent === "OPTED_IN" || value.suppressed === false) &&
      !value.evidence
    )
      ctx.addIssue({
        code: "custom",
        message: "Recorded consent evidence is required",
      });
    if (value.suppressed === true && !value.reason)
      ctx.addIssue({
        code: "custom",
        message: "A suppression reason is required",
      });
  });

export class UnsubscribeTokens {
  constructor(private readonly secret: string) {}
  issue(email: string, campaign: string): string {
    if (this.secret.length < 32)
      throw createPublicError(503, "Unsubscribe signing is not configured");
    const payload = Buffer.from(
      JSON.stringify({ email: email.toLowerCase(), campaign }),
    ).toString("base64url");
    return (
      payload +
      "." +
      createHmac("sha256", this.secret).update(payload).digest("base64url")
    );
  }
  verify(token: string): { email: string; campaign: string } {
    if (token.length > 1500 || this.secret.length < 32)
      throw createPublicError(400, "Invalid unsubscribe link");
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra)
      throw createPublicError(400, "Invalid unsubscribe link");
    const expected = createHmac("sha256", this.secret).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      throw createPublicError(400, "Invalid unsubscribe link");
    try {
      return z
        .object({
          email: z.email().max(254),
          campaign: z.string().regex(/^AIAIAC-COM-[A-F0-9]{8}$/),
        })
        .strict()
        .parse(JSON.parse(Buffer.from(payload, "base64url").toString()));
    } catch {
      throw createPublicError(400, "Invalid unsubscribe link");
    }
  }
}

export function validateSchedule(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  const delay = date.getTime() - Date.now();
  if (!Number.isFinite(delay) || delay < 60_000 || delay > 90 * 86400_000)
    throw createPublicError(
      400,
      "Schedule between one minute and 90 days from now",
    );
  return date;
}
