import { z } from "zod";
import { normalizeEmail } from "./auth.validator";

export const emailVerificationTokenSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export const emailVerificationResendSchema = z.strictObject({
  registrationReference: z
    .string()
    .trim()
    .regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/),
  email: z.preprocess(
    (value) => (typeof value === "string" ? normalizeEmail(value) : value),
    z.string().max(254).email(),
  ),
});
