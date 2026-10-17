import { z } from "zod";
import {
  accreditationCategories,
  accreditationStatuses,
  intakeCategories,
} from "../types/accreditation";
import { normalizeEmail } from "./auth.validator";

const normalizedEmail = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.email().max(254),
);
const optionalLabel = (max: number) =>
  z.string().trim().min(2).max(max).optional();

export const accreditationIdParamsSchema = z.strictObject({ id: z.uuid() });
export const accreditationListSchema = z.strictObject({
  eventId: z.uuid(),
  category: z.enum(accreditationCategories).optional(),
  status: z.enum(accreditationStatuses).optional(),
  page: z.coerce.number().int().min(1).max(100000).optional(),
});
export const accreditationCreateSchema = z
  .strictObject({
    eventId: z.uuid(),
    category: z.enum(intakeCategories),
    fullName: z
      .string()
      .trim()
      .min(2)
      .max(160)
      .transform((value) => value.replace(/\s+/g, " ")),
    email: normalizedEmail,
    organizationName: optionalLabel(160),
    country: optionalLabel(100),
    sourceApplicationReference: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^AIAIAC-(SPN|EXH)-[A-Z0-9]{8}$/)
      .optional(),
  })
  .superRefine((input, context) => {
    const representative =
      input.category === "SPONSOR_REPRESENTATIVE" ||
      input.category === "EXHIBITOR_REPRESENTATIVE";
    if (representative !== Boolean(input.sourceApplicationReference)) {
      context.addIssue({
        code: "custom",
        path: ["sourceApplicationReference"],
        message: representative
          ? "Application reference required"
          : "Not allowed for this category",
      });
    }
    if (representative && input.sourceApplicationReference) {
      const prefix =
        input.category === "SPONSOR_REPRESENTATIVE"
          ? "AIAIAC-SPN-"
          : "AIAIAC-EXH-";
      if (!input.sourceApplicationReference.startsWith(prefix)) {
        context.addIssue({
          code: "custom",
          path: ["sourceApplicationReference"],
          message: "Application type does not match category",
        });
      }
    }
  });
export const accreditationStatusSchema = z.strictObject({
  status: z.enum(["APPROVED", "REVOKED"]),
});

export type AccreditationCreateInput = z.infer<
  typeof accreditationCreateSchema
>;
export type AccreditationListInput = z.infer<typeof accreditationListSchema>;
