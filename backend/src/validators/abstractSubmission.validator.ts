import { z } from "zod";
import { ABSTRACT_MAX_WORDS, countAbstractWords } from "../abstracts/wordCount";
import {
  abstractStatuses,
  abstractTopics,
  type AbstractListFilters,
} from "../types/abstractSubmission";
import { normalizeEmail } from "./auth.validator";

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
const body = z
  .string()
  .trim()
  .min(20)
  .max(10_000)
  .superRefine((value, context) => {
    if (countAbstractWords(value) > ABSTRACT_MAX_WORDS) {
      context.addIssue({
        code: "custom",
        message: "Abstract exceeds 500 words",
      });
    }
  });
const content = {
  title: normalizedString(5, 300),
  abstractBody: body,
  keywords: optionalString(500),
  topic: z.enum(abstractTopics).optional(),
} as const;

export const abstractSubmissionSchema = z.strictObject({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  authorFirstName: normalizedString(1, 100),
  authorLastName: normalizedString(1, 100),
  authorEmail: email,
  authorPhone: normalizedString(5, 40),
  organizationName: normalizedString(2, 200),
  jobTitle: optionalString(150),
  country: normalizedString(2, 100),
  ...content,
  consent: z.literal(true),
});

export const abstractRevisionSchema = z.strictObject(content);
export const abstractResubmissionSchema = z.strictObject({});
export const abstractReferenceParamsSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-ABS-[A-Z0-9]{8}$/),
});
export const abstractContinuationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);
export const abstractRecoveryRequestSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-ABS-[A-Z0-9]{8}$/),
  email,
});
export const abstractRecoveryExchangeSchema = z.strictObject({
  recoveryToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

const reviewReason = normalizedString(10, 1000);
export const abstractStartReviewSchema = z.strictObject({});
export const abstractAcceptanceSchema = z.strictObject({
  note: optionalString(1000),
});
export const abstractRevisionRequestSchema = z.strictObject({
  reason: reviewReason,
});
export const abstractRejectionSchema = z.strictObject({ reason: reviewReason });
export const abstractNotificationRetrySchema = z.strictObject({});

const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() ? value.trim() : undefined,
      z.string().max(100).optional(),
    ),
    status: z.enum(abstractStatuses).optional(),
  })
  .strict();

export function parseAbstractListFilters(
  input: unknown,
): AbstractListFilters | null {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    page: parsed.data.page,
    pageSize: parsed.data.limit,
    ...(parsed.data.search ? { search: parsed.data.search } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
  };
}
