import { z } from "zod";

// Raw QR values are accepted only in JSON bodies, never URL parameters or query strings.
const credential = z.string().min(1).max(256);
const registrationReference = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/);

export const validateCheckInSchema = z.object({ credential }).strict();
export const lookupCheckInSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(254)
      .refine(
        (value) =>
          registrationReference.safeParse(value).success ||
          z.email().safeParse(value).success,
      ),
  })
  .strict();
export const confirmCheckInSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("QR"), credential }).strict(),
  z
    .object({ method: z.literal("MANUAL_LOOKUP"), registrationReference })
    .strict(),
]);
export const recentCheckInSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
