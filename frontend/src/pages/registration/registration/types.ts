export const participationTypes = [
  "General Participation Enquiry",
  "Delegate Registration",
  "Corporate Participation",
  "Sponsorship",
  "Exhibition",
  "Speaker or Abstract Enquiry",
  "Media Enquiry",
] as const;

export type ParticipationType = (typeof participationTypes)[number];
