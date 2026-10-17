import { z } from "zod";
import {
  communicationAudiences,
  communicationPurposes,
  isRegisteredDelegateAudience,
  isEventParticipantAudience,
} from "../types/communication";

const cleanText = (max: number, min = 1) => z.string().trim().min(min).max(max);
const cleanLine = (max: number, min = 1) =>
  cleanText(max, min).refine(
    (value) => !/[\r\n]/.test(value),
    "Line breaks are not allowed",
  );
const audienceSchema = z
  .object({
    code: z.enum(communicationAudiences),
    purpose: z.enum(communicationPurposes).optional(),
    registrationStatus: z
      .enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"])
      .optional(),
    paymentStatus: z
      .enum([
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
        "UNPAID",
        "ABANDONED",
      ])
      .optional(),
    verificationStatus: z
      .enum([
        "NOT_SUBMITTED",
        "PENDING",
        "MORE_INFORMATION_REQUIRED",
        "APPROVED",
        "REJECTED",
      ])
      .optional(),
    country: cleanLine(100).optional(),
    currency: z.enum(["NGN", "USD"]).optional(),
    abstractStatus: z
      .enum([
        "SUBMITTED",
        "UNDER_REVIEW",
        "REVISION_REQUIRED",
        "ACCEPTED",
        "REJECTED",
      ])
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const delegates = isRegisteredDelegateAudience(value.code);
    if (
      value.purpose === "ESSENTIAL_EVENT_UPDATE" &&
      !isEventParticipantAudience(value.code)
    )
      context.addIssue({
        code: "custom",
        message: "Event updates require existing conference participants",
      });
    if (
      value.purpose === "PAYMENT_REMINDER" &&
      (!delegates ||
        !["UNPAID", "ABANDONED"].includes(value.paymentStatus ?? ""))
    )
      context.addIssue({
        code: "custom",
        message: "Payment reminders require unpaid or abandoned delegates",
      });
    if (
      !delegates &&
      (value.registrationStatus ||
        value.paymentStatus ||
        value.verificationStatus ||
        value.country ||
        value.currency)
    ) {
      context.addIssue({
        code: "custom",
        message: "Delegate filters require a delegate audience",
      });
    }
    if (
      value.verificationStatus &&
      !["ALL_DELEGATES", "STUDENT_DELEGATES"].includes(value.code)
    ) {
      context.addIssue({
        code: "custom",
        message: "Verification status requires a Student audience",
      });
    }
    if (value.abstractStatus && value.code !== "ABSTRACT_AUTHORS") {
      context.addIssue({
        code: "custom",
        message: "Abstract status requires abstract authors",
      });
    }
  });

export const communicationContentSchema = z
  .object({
    purpose: z.enum(communicationPurposes).default("MARKETING"),
    title: cleanLine(120, 3),
    subject: cleanLine(180, 3),
    preheader: cleanLine(180, 3),
    heading: cleanLine(180, 3),
    body: cleanText(5000, 10),
    ctaLabel: cleanLine(80).nullable().optional(),
    ctaUrl: z
      .url({ protocol: /^https$/ })
      .max(500)
      .nullable()
      .optional(),
    audience: audienceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.purpose === "ESSENTIAL_EVENT_UPDATE" &&
      !isEventParticipantAudience(value.audience.code)
    )
      context.addIssue({
        code: "custom",
        message: "Event updates require existing conference participants",
      });
    if (
      value.purpose === "PAYMENT_REMINDER" &&
      (!isRegisteredDelegateAudience(value.audience.code) ||
        !["UNPAID", "ABANDONED"].includes(value.audience.paymentStatus ?? ""))
    ) {
      context.addIssue({
        code: "custom",
        message: "Payment reminders require unpaid or abandoned delegates",
      });
    }
    if (Boolean(value.ctaLabel) !== Boolean(value.ctaUrl)) {
      context.addIssue({
        code: "custom",
        message: "CTA label and HTTPS URL must be provided together",
      });
    }
  });

export const audienceRequestSchema = audienceSchema;
export const testSendSchema = z.object({ email: z.email().max(254) }).strict();
export const confirmSchema = z
  .object({
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    revision: z.number().int().positive(),
    acknowledged: z.literal(true),
    scheduledAt: z.iso.datetime().optional(),
  })
  .strict();
export const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    status: z
      .enum([
        "DRAFT",
        "SCHEDULED",
        "CANCELLED",
        "SENDING",
        "SENT",
        "PARTIALLY_FAILED",
        "FAILED",
      ])
      .optional(),
  })
  .strict();
export const deliveryListSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    status: z
      .enum(["PENDING", "CLAIMED", "SENT", "FAILED", "SKIPPED", "UNCERTAIN"])
      .optional(),
    campaign: z
      .string()
      .regex(/^AIAIAC-COM-[A-F0-9]{8}$/)
      .optional(),
  })
  .strict();
