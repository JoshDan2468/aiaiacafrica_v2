import { z } from "zod";
import { abstractStatuses } from "../types/abstractSubmission";
import { commercialApplicationStatuses } from "../types/commercialApplication";
import { enquiryCategories, enquiryStatuses } from "../types/enquiry";
import {
  reportDomains,
  type ReportDomain,
  type ReportFilters,
} from "../types/report";
import { studentVerificationStatuses } from "../types/studentVerification";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  });

const querySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: date.optional(),
  dateTo: date.optional(),
  status: z.string().max(40).optional(),
  paymentStatus: z.string().max(24).optional(),
  currency: z.enum(["NGN", "USD"]).optional(),
  package: z
    .string()
    .regex(/^[A-Z0-9_]{1,80}$/)
    .optional(),
  category: z.enum(enquiryCategories).optional(),
});

const statuses: Record<ReportDomain, readonly string[]> = {
  delegates: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  students: studentVerificationStatuses,
  payments: [
    "INITIALIZED",
    "PENDING",
    "PAID",
    "FAILED",
    "ABANDONED",
    "REVERSED",
    "DUPLICATE_SUCCESS",
    "RECONCILIATION_REQUIRED",
  ],
  sponsors: commercialApplicationStatuses,
  exhibitors: commercialApplicationStatuses,
  abstracts: abstractStatuses,
  enquiries: enquiryStatuses,
};

export function parseReportDomain(input: string): ReportDomain | null {
  return reportDomains.find((domain) => domain === input) ?? null;
}

export function parseReportFilters(
  domain: ReportDomain,
  input: unknown,
): ReportFilters | null {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return null;
  const filters = parsed.data;
  if (filters.status && !statuses[domain].includes(filters.status)) return null;
  if (
    filters.paymentStatus &&
    (domain !== "delegates" ||
      !["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"].includes(
        filters.paymentStatus,
      ))
  )
    return null;
  if (filters.currency && domain !== "payments") return null;
  if (
    filters.package &&
    !["payments", "sponsors", "exhibitors"].includes(domain)
  )
    return null;
  if (filters.category && domain !== "enquiries") return null;
  if (filters.dateFrom && filters.dateTo) {
    const from = new Date(`${filters.dateFrom}T00:00:00.000Z`).getTime();
    const to = new Date(`${filters.dateTo}T00:00:00.000Z`).getTime();
    if (to < from || to - from > 366 * 86_400_000) return null;
  }
  return filters;
}
