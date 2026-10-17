import { z } from "zod";

export const sponsorEnquirySchema = z.object({
  fullName: z.string().trim().min(2, "Enter the contact person's full name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a contact number"),
  jobTitle: z.string().trim().min(2, "Enter your job title"),
  organisation: z.string().trim().min(2, "Enter the company or organisation"),
  country: z.string().trim().min(2, "Enter your country"),
  message: z.string().trim().max(1000, "Keep the message below 1000 characters").optional(),
});
