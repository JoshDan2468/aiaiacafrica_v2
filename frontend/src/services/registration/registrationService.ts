import { z } from "zod";
import { apiPost } from "../api/client";

export const registrationSchema = z.object({
  intent: z.enum(["delegate", "exhibitor", "sponsor"]),
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(6, "Please enter a contact number"),
  jobTitle: z.string().min(2, "Please enter your job title"),
  organisation: z.string().min(2, "Please enter your organisation"),
  country: z.string().min(2, "Please enter your country"),
  message: z.string().max(1000).optional().or(z.literal("")),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export interface RegistrationResponse {
  reference: string;
  /** Populated once the payment gateway is connected. */
  paymentUrl?: string;
}

/**
 * Phase 1: submits to the mock API boundary. No payment is taken and no
 * transaction is created. When the backend, payment gateway and email
 * system are added, only this function changes.
 */
export async function submitRegistration(input: RegistrationInput) {
  const parsed = registrationSchema.parse(input);
  const result = await apiPost<RegistrationInput, RegistrationResponse>("/registrations", parsed);
  return result;
}
