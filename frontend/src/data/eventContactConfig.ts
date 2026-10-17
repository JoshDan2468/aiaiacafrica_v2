import { conference } from "./conference";

export const AIAIAC_WHATSAPP_RAW = conference.contact.phone;
export const AIAIAC_WHATSAPP_NUMBER = conference.contact.phone.replace(/[^0-9]/g, "");
export const AIAIAC_CONTACT_EMAIL = conference.contact.email;

export const EVENT_CONTACT_CONFIG = {
  phoneFormatted: AIAIAC_WHATSAPP_RAW,
  phoneRaw: AIAIAC_WHATSAPP_NUMBER,
  email: AIAIAC_CONTACT_EMAIL,
};

export type EnquiryIntent =
  "SPONSORSHIP" | "EXHIBITION" | "DELEGATE" | "CORPORATE" | "ABSTRACT" | "GENERAL";

const ENQUIRY_MESSAGES: Record<EnquiryIntent, string> = {
  SPONSORSHIP:
    "Hello AIAIAC Africa team. I would like information about sponsorship opportunities for AIAIAC Africa 2027.",
  EXHIBITION:
    "Hello AIAIAC Africa team. I would like information about exhibiting at AIAIAC Africa 2027.",
  DELEGATE:
    "Hello AIAIAC Africa team. I would like information about delegate participation for AIAIAC Africa 2027.",
  CORPORATE:
    "Hello AIAIAC Africa team. I would like information about corporate group participation for AIAIAC Africa 2027.",
  ABSTRACT:
    "Hello AIAIAC Africa team. I have an enquiry regarding abstract submission and technical paper presentation at AIAIAC Africa 2027.",
  GENERAL: "Hello AIAIAC Africa team. I would like to make an enquiry about AIAIAC Africa 2027.",
};

export function getWhatsAppEnquiryUrl(intent: EnquiryIntent = "GENERAL", detail?: string): string {
  let message = ENQUIRY_MESSAGES[intent] || ENQUIRY_MESSAGES.GENERAL;
  if (detail && detail !== message) {
    message = detail;
  }
  return `https://wa.me/${AIAIAC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
