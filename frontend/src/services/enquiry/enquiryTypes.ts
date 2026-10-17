export const enquiryCategories = [
  "GENERAL",
  "REGISTRATION",
  "SPONSORSHIP",
  "EXHIBITION",
  "MEDIA",
  "SPEAKER_ABSTRACT",
  "PARTNERSHIP",
  "OTHER",
] as const;
export type EnquiryCategory = (typeof enquiryCategories)[number];
export type EnquiryStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
