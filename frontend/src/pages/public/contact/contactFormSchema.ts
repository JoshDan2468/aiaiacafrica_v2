import { z } from "zod";
import { enquiryTypeValues } from "@/data/contact";

export const contactFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Please enter your first name.")
    .max(100, "Please keep your first name under 100 characters."),
  lastName: z.string().trim().min(1, "Please enter your last name.").max(100),
  workEmail: z
    .string()
    .trim()
    .min(1, "Please enter your work email.")
    .max(254)
    .email("Please enter a valid email address."),
  phoneNumber: z
    .string()
    .trim()
    .max(40, "Please keep the phone number under 40 characters.")
    .refine(
      (value) => value === "" || /^[+()0-9\s.-]{6,40}$/.test(value),
      "Please enter a valid phone number or leave this field empty.",
    ),
  organisation: z
    .string()
    .trim()
    .max(200, "Please keep the organisation name under 200 characters."),
  enquiryType: z.enum(enquiryTypeValues, {
    message: "Please choose an enquiry type.",
  }),
  subject: z
    .string()
    .trim()
    .min(3, "Please enter a subject of at least 3 characters.")
    .max(160, "Please keep the subject under 160 characters."),
  message: z
    .string()
    .trim()
    .min(20, "Please provide more details (at least 20 characters).")
    .max(3000, "Please keep the message under 3000 characters."),
});

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormValues = z.output<typeof contactFormSchema>;
