import { z } from "zod";
import { contactTypes } from "../types/contact";

const oneLine = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value),
      "Control characters are not allowed",
    );

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value),
      "Control characters are not allowed",
    )
    .transform((value) => value || undefined)
    .optional();

export const manualContactSchema = z
  .object({
    name: oneLine(200),
    category: z
      .enum([
        "GENERAL_CONTACT",
        "PROSPECTIVE_DELEGATE",
        "PROSPECTIVE_SPONSOR",
        "PROSPECTIVE_EXHIBITOR",
      ])
      .optional(),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    organization: optionalLine(200),
    country: optionalLine(100),
    consent: z.enum(["UNKNOWN", "OPTED_IN", "OPTED_OUT"]).optional(),
    consentEvidence: optionalLine(500),
    sourceLabel: optionalLine(200),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.consent === "OPTED_IN" && !value.consentEvidence)
      ctx.addIssue({
        code: "custom",
        message: "Consent evidence is required",
        path: ["consentEvidence"],
      });
  });

export const contactListSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z
      .string()
      .trim()
      .max(100)
      .transform((value) => value || undefined)
      .optional(),
    type: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(contactTypes).optional(),
    ),
    source: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(["SYSTEM", "MANUAL", "IMPORT"]).optional(),
    ),
  })
  .strict();

export const contactImportSchema = z
  .object({ csv: z.string().min(1) })
  .strict();
