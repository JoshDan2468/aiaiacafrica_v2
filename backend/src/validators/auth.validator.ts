import { z } from "zod";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const normalizedEmailSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.string().max(254).email(),
);

export const loginSchema = z.strictObject({
  email: normalizedEmailSchema,
  password: z.string().min(1).max(128),
});

// Shared with invitation acceptance so all Admin password creation follows one policy.
export const adminPasswordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

export const initialSuperAdminSchema = z.strictObject({
  fullName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .transform((value) => value.replace(/\s+/g, " ")),
  email: normalizedEmailSchema,
  password: adminPasswordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type InitialSuperAdminInput = z.infer<typeof initialSuperAdminSchema>;
