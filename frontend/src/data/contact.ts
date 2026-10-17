import { conference } from "@/data/conference";

export const enquiryTypeValues = [
  "General Enquiry",
  "Delegate Enquiry",
  "Sponsorship Enquiry",
  "Exhibition Enquiry",
  "Speaker or Abstract Enquiry",
  "Media Enquiry",
  "Partnership Enquiry",
  "Other Enquiry",
] as const;

export type EnquiryType = (typeof enquiryTypeValues)[number];

export const contactDetails = {
  email: conference.contact.email,
  phone: conference.contact.phone,
  phoneHref: conference.contact.phone.replace(/[^\d+]/g, ""),
} as const;

export const enquiryTypes = enquiryTypeValues.map((label, index) => ({
  index: String(index + 1).padStart(2, "0"),
  label,
}));
