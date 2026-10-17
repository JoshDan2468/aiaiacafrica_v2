import { z } from "zod";
import {
  enquiryCategories,
  enquiryStatuses,
  type EnquiryListFilters,
} from "../types/enquiry";
import { normalizeEmail } from "./auth.validator";

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .transform((value) => value.replace(/\s+/gu, " "));
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value : undefined),
    text(1, max).optional(),
  );
const email = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.string().max(254).email(),
);

export const enquirySubmissionSchema = z.strictObject({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  firstName: text(1, 100),
  lastName: text(1, 100),
  email,
  phone: optionalText(40),
  organization: optionalText(200),
  country: optionalText(100),
  category: z.enum(enquiryCategories),
  subject: text(3, 160),
  message: z.string().trim().min(20).max(3000),
});

export const enquiryReferenceSchema = z.strictObject({
  reference: z.string().regex(/^AIAIAC-ENQ-[A-Z0-9]{8}$/),
});
export const enquiryDecisionSchema = z.strictObject({
  note: optionalText(1000),
});
export const enquiryRetrySchema = z.strictObject({});

const listSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalText(100),
  category: z.enum(enquiryCategories).optional(),
  status: z.enum(enquiryStatuses).optional(),
});

export function parseEnquiryListFilters(
  input: unknown,
): EnquiryListFilters | null {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    page: parsed.data.page,
    pageSize: parsed.data.limit,
    ...(parsed.data.search ? { search: parsed.data.search } : {}),
    ...(parsed.data.category ? { category: parsed.data.category } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
  };
}
