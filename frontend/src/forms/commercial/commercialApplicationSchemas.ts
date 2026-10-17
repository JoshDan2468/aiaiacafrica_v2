import { z } from "zod";

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
    z.string().max(max).optional(),
  );
const website = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.string().url("Enter a complete website URL").max(500).optional(),
);

const fields = {
  organizationName: text(2, 200, "Enter the organization name"),
  country: text(2, 100, "Enter the organization country"),
  website,
  industry: optionalText(150),
  contactFirstName: text(1, 100, "Enter the contact first name"),
  contactLastName: text(1, 100, "Enter the contact last name"),
  contactEmail: z.string().trim().email("Enter a valid work email").max(254),
  contactPhone: text(5, 40, "Enter a valid phone number"),
  contactJobTitle: optionalText(150),
  notes: optionalText(2000),
  consent: z.literal(true, { errorMap: () => ({ message: "Acknowledgement is required" }) }),
} as const;

export const sponsorApplicationSchema = z
  .object({
    ...fields,
    sponsorshipTier: z.enum(["TITLE", "STRATEGIC", "DIAMOND", "PLATINUM", "GOLD", "SILVER"]),
  })
  .strict();

export const exhibitorApplicationSchema = z
  .object({ ...fields, exhibitionOption: z.enum(["9_SQM", "18_SQM", "36_SQM"]) })
  .strict();

export type SponsorApplicationValues = z.infer<typeof sponsorApplicationSchema>;
export type ExhibitorApplicationValues = z.infer<typeof exhibitorApplicationSchema>;
