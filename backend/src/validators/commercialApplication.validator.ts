import { z } from "zod";
import { normalizeEmail } from "./auth.validator";
import {
  commercialApplicationStatuses,
  exhibitionOptionCodes,
  sponsorshipTierCodes,
  type CommercialApplicationListFilters,
} from "../types/commercialApplication";

const normalizedString = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .transform((value) => value.replace(/\s+/g, " "));

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    normalizedString(1, max).optional(),
  );

const email = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.string().max(254).email(),
);

const optionalWebsite = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined,
  z
    .url()
    .max(500)
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol))
    .optional(),
);

const baseApplication = {
  organizationName: normalizedString(2, 200),
  country: normalizedString(2, 100),
  website: optionalWebsite,
  industry: optionalString(150),
  contactFirstName: normalizedString(1, 100),
  contactLastName: normalizedString(1, 100),
  contactEmail: email,
  contactPhone: normalizedString(5, 40),
  contactJobTitle: optionalString(150),
  notes: optionalString(2000),
  consent: z.literal(true),
} as const;

export const sponsorApplicationSchema = z.strictObject({
  ...baseApplication,
  sponsorshipTier: z.enum(sponsorshipTierCodes),
});

export const exhibitorApplicationSchema = z.strictObject({
  ...baseApplication,
  exhibitionOption: z.enum(exhibitionOptionCodes),
});

export const sponsorReferenceParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-SPN-[A-Z0-9]{8}$/),
});

export const exhibitorReferenceParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-EXH-[A-Z0-9]{8}$/),
});

const reason = normalizedString(10, 1000);
export const commercialConfirmationSchema = z.strictObject({
  note: optionalString(1000),
});
export const commercialMoreInformationSchema = z.strictObject({ reason });
export const commercialDeclineSchema = z.strictObject({ reason });
export const commercialNotificationRetrySchema = z.strictObject({});

const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value.trim() : undefined,
      z.string().max(100).optional(),
    ),
    status: z.enum(commercialApplicationStatuses).optional(),
    package: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value.trim() : undefined,
      z.string().max(32).optional(),
    ),
  })
  .strict();

export function parseCommercialApplicationListFilters(
  input: unknown,
): CommercialApplicationListFilters | null {
  const parsed = listQuerySchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    page: parsed.data.page,
    pageSize: parsed.data.limit,
    ...(parsed.data.search ? { search: parsed.data.search } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.package
      ? { packageCode: parsed.data.package.toUpperCase() }
      : {}),
  };
}
