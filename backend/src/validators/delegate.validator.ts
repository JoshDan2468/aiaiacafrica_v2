import { z } from "zod";
import { normalizeEmail } from "./auth.validator";
import type {
  DelegateListFilters,
  PaymentStatus,
  RegistrationStatus,
} from "../types/delegate";

const normalizedString = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .transform((value) => value.replace(/\s+/g, " "));

const normalizedEmailSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.string().max(254).email(),
);

export const delegateRegistrationSchema = z.strictObject({
  packageId: z.string().uuid(),
  firstName: normalizedString(1, 100),
  lastName: normalizedString(1, 100),
  email: normalizedEmailSchema,
  mobile: normalizedString(5, 40),
  telephone: z
    .string()
    .trim()
    .max(40)
    .transform((value) => value.replace(/\s+/g, " "))
    .optional()
    .transform((value) => value || undefined),
  jobTitle: normalizedString(2, 150),
  companyName: normalizedString(2, 150),
  country: normalizedString(2, 100),
  primaryActivity: normalizedString(2, 200),
  mainObjective: normalizedString(10, 1000),
  heardAboutSource: normalizedString(2, 200),
  privacyConsent: z.literal(true),
  dataSharingConsent: z.boolean(),
});

const registrationStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
const paymentStatuses = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
] as const;

const optionalQueryString = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined,
    z.string().max(max).optional(),
  );

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined,
  z
    .string()
    .date()
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .optional(),
);

const delegateListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: optionalQueryString(100),
    packageId: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value.trim() : undefined,
      z.string().uuid().optional(),
    ),
    registrationStatus: z.enum(registrationStatuses).optional(),
    paymentStatus: z.enum(paymentStatuses).optional(),
    country: optionalQueryString(100),
    submittedFrom: optionalDate,
    submittedTo: optionalDate,
    sort: z
      .enum(["submitted_desc", "submitted_asc", "name_asc", "name_desc"])
      .default("submitted_desc"),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.submittedFrom &&
      value.submittedTo &&
      value.submittedFrom > value.submittedTo
    ) {
      context.addIssue({
        code: "custom",
        path: ["submittedTo"],
        message: "Invalid date range",
      });
    }
  });

export function parseDelegateListFilters(
  input: unknown,
): DelegateListFilters | null {
  const parsed = delegateListQuerySchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export const delegateDetailParamsSchema = z.strictObject({
  id: z.string().uuid(),
});

export const registrationRecoveryRequestSchema = z.strictObject({
  email: normalizedEmailSchema,
});

const secureTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const registrationRecoveryExchangeSchema = z.strictObject({
  recoveryToken: secureTokenSchema,
});

export const registrationContinuationSchema = z.strictObject({
  continuationToken: secureTokenSchema,
});

export const registrationRetryPaymentSchema = z.strictObject({
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]).default("PAYSTACK"),
  continuationToken: secureTokenSchema,
  currency: z.enum(["USD", "NGN"]),
});

export type DelegateRegistrationRequest = z.infer<
  typeof delegateRegistrationSchema
>;
export { paymentStatuses, registrationStatuses };
