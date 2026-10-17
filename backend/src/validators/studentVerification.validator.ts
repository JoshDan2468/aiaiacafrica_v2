import { z } from "zod";
import { normalizeEmail } from "./auth.validator";
import { studentVerificationStatuses } from "../types/studentVerification";
import type { StudentVerificationListFilters } from "../types/studentVerification";

const normalizedString = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .transform((value) => value.replace(/\s+/g, " "));

const email = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.string().max(254).email(),
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim()
      ? normalizeEmail(value)
      : undefined,
  z.string().max(254).email().optional(),
);

export const studentApplicationSchema = z.strictObject({
  packageId: z.string().uuid(),
  firstName: normalizedString(1, 100),
  lastName: normalizedString(1, 100),
  email,
  mobile: normalizedString(5, 40),
  telephone: z
    .string()
    .trim()
    .max(40)
    .transform((value) => value.replace(/\s+/g, " "))
    .optional()
    .transform((value) => value || undefined),
  country: normalizedString(2, 100),
  mainObjective: normalizedString(10, 1000),
  heardAboutSource: normalizedString(2, 200),
  privacyConsent: z.literal(true),
  dataSharingConsent: z.boolean(),
  institutionName: normalizedString(2, 200),
  institutionCountry: normalizedString(2, 100),
  programmeOfStudy: normalizedString(2, 200),
  studentIdentificationNumber: normalizedString(2, 100),
  expectedGraduationYear: z.coerce.number().int().min(2026).max(2100),
  institutionalEmail: optionalEmail,
});

export const studentVerificationSubmissionSchema = z.strictObject({});

const reviewReason = normalizedString(10, 1000);

export const studentApprovalSchema = z.strictObject({
  note: normalizedString(1, 1000).optional(),
});

export const studentMoreInformationSchema = z.strictObject({
  reason: reviewReason,
});

export const studentRejectionSchema = z.strictObject({
  reason: reviewReason,
});

export const studentRecoveryRequestSchema = z.strictObject({
  registrationReference: z.string().regex(/^AIAIAC-DEL-[A-Z0-9]{8}$/),
  email,
});

export const studentRecoveryExchangeSchema = z.strictObject({
  recoveryToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

const studentVerificationListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value.trim() : undefined,
      z.string().max(100).optional(),
    ),
    status: z.enum(studentVerificationStatuses).optional(),
  })
  .strict();

export function parseStudentVerificationListFilters(
  input: unknown,
): StudentVerificationListFilters | null {
  const parsed = studentVerificationListQuerySchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export type StudentApplicationRequest = z.infer<
  typeof studentApplicationSchema
>;
