/**
 * Admin user and invitation validators
 *
 * Strict schemas reject unexpected security-sensitive fields before business
 * logic runs. Normal invitation APIs never accept SUPER_ADMIN as an input.
 */

import { z } from "zod";
import { assignableAdminRoles } from "../types/admin";
import { adminPasswordSchema, normalizeEmail } from "./auth.validator";

const normalizedEmailSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.string().max(254).email(),
);

const fullNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .transform((value) => value.replace(/\s+/g, " "));

const invitationTokenSchema = z
  .string()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export const createAdminInvitationSchema = z.strictObject({
  name: fullNameSchema,
  email: normalizedEmailSchema,
  role: z.enum([...assignableAdminRoles, "SUPER_ADMIN"]),
});

export const invitationIdParamsSchema = z.strictObject({ id: z.uuid() });

export const validateAdminInvitationSchema = z.strictObject({
  token: invitationTokenSchema,
});

export const acceptAdminInvitationSchema = z
  .strictObject({
    token: invitationTokenSchema,
    password: adminPasswordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const updateAdminStatusSchema = z.strictObject({
  isActive: z.boolean(),
});

export const updateAdminRoleSchema = z.strictObject({
  role: z.enum(assignableAdminRoles),
});

export type CreateAdminInvitationInput = z.infer<
  typeof createAdminInvitationSchema
>;
export type AcceptAdminInvitationInput = z.infer<
  typeof acceptAdminInvitationSchema
>;
