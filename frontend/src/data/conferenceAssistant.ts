import { conference } from "./conference";
import {
  AIAIAC_WHATSAPP_NUMBER,
  getWhatsAppEnquiryUrl,
  type EnquiryIntent,
} from "./eventContactConfig";

export interface QuickReplyOption {
  id: string;
  label: string;
  topicId: string;
}

export interface AssistantAction {
  label: string;
  type: "route" | "whatsapp" | "topic";
  target?: string | undefined;
  topicId?: string | undefined;
}

export interface AssistantTopicResponse {
  id: string;
  title: string;
  text: string;
  secondaryText?: string | undefined;
  bulletPoints?: readonly string[] | undefined;
  actions: readonly AssistantAction[];
}

export { AIAIAC_WHATSAPP_NUMBER };

export const initialQuickReplies: readonly QuickReplyOption[] = [
  { id: "enq", label: "Make an Enquiry", topicId: "enquiry-options" },
  { id: "reg", label: "Register for AIAIAC", topicId: "registration" },
  { id: "spon", label: "Sponsorship Opportunities", topicId: "sponsorship" },
  { id: "exh", label: "Book an Exhibition Stand", topicId: "exhibition" },
  { id: "abs", label: "Submit an Abstract", topicId: "abstracts" },
  { id: "evt", label: "Event Information", topicId: "event-details" },
  { id: "prog", label: "Conference Programme", topicId: "programme" },
  { id: "team", label: "Speak with Our Team", topicId: "human-handoff" },
] as const;

export const topicResponses: Record<string, AssistantTopicResponse> = {
  registration: {
    id: "registration",
    title: "Register for AIAIAC",
    text: "Great! I can help you find the right participation option for AIAIAC Africa 2027.",
    bulletPoints: [
      "Access to 2 Specialised Technical Conference Halls",
      "Entry to Innovation Showcase & Exhibition Floor",
      "Delegate proceedings, kit, and executive networking sessions",
    ],
    actions: [
      { label: "Delegate Registration", type: "route", target: "/registration/delegate" },
      { label: "Make an Exhibition Enquiry", type: "route", target: "/exhibition" },
      { label: "Make a Sponsorship Enquiry", type: "route", target: "/sponsorship" },
      { label: "Submit an Abstract", type: "route", target: "/registration/abstract" },
      { label: "Continue on WhatsApp", type: "whatsapp", topicId: "registration" },
      { label: "Back to Options", type: "topic", topicId: "initial-options" },
    ],
  },

  "enquiry-options": {
    id: "enquiry-options",
    title: "Make an Enquiry",
    text: "Connect directly with our commercial and conference team for personalized participation packages.",
    secondaryText: "Choose the area you would like to enquire about:",
    bulletPoints: [
      "Sponsorship & brand visibility opportunities",
      "Exhibition stands (9 sqm, 18 sqm, 36 sqm)",
      "Delegate registration passes",
      "Corporate group delegate packages",
      "General event and participation enquiries",
    ],
    actions: [
      { label: "Sponsorship", type: "whatsapp", topicId: "sponsorship" },
      { label: "Exhibition", type: "whatsapp", topicId: "exhibition" },
      { label: "Delegate Registration", type: "whatsapp", topicId: "registration" },
      { label: "Corporate Participation", type: "whatsapp", topicId: "corporate" },
      { label: "General Enquiry", type: "whatsapp", topicId: "general" },
      { label: "Back to Main Options", type: "topic", topicId: "initial-options" },
    ],
  },

  sponsorship: {
    id: "sponsorship",
    title: "Sponsorship Opportunities",
    text: "AIAIAC Africa 2027 offers bespoke sponsorship opportunities for organisations looking to engage industry leaders, operators, and decision-makers across West Africa and beyond.",
    secondaryText:
      "Would you like to review package details or speak directly with our commercial desk?",
    bulletPoints: [
      "Title & Strategic Sponsor tier opportunities",
      "Diamond, Platinum, Gold & Silver packages",
      "Keynote speaking slots, plenary addresses & VIP networking",
      "Comprehensive digital, print & onsite exhibition presence",
    ],
    actions: [
      { label: "View Sponsorship Overview", type: "route", target: "/sponsorship" },
      { label: "Make a Sponsorship Enquiry", type: "whatsapp", topicId: "sponsorship" },
      { label: "Back to Options", type: "topic", topicId: "initial-options" },
    ],
  },

  exhibition: {
    id: "exhibition",
    title: "Book an Exhibition Stand",
    text: "Showcase your technology, products, and industrial solutions directly to 1,200+ decision-makers on the AIAIAC Africa 2027 exhibition floor.",
    bulletPoints: [
      "9 sqm, 18 sqm, and 36 sqm stand options",
      "Fully fitted aluminium shell scheme with fascia, lighting & power",
      "Included exhibitor passes and conference access",
      "Official directory listing and product showcases",
    ],
    actions: [
      { label: "View Exhibition Details", type: "route", target: "/exhibition" },
      { label: "Make an Exhibition Enquiry", type: "whatsapp", topicId: "exhibition" },
      { label: "Back to Options", type: "topic", topicId: "initial-options" },
    ],
  },

  abstracts: {
    id: "abstracts",
    title: "Submit an Abstract",
    text: "Share your operational experience, empirical research, or industrial case studies at AIAIAC Africa 2027.",
    bulletPoints: [
      "Maximum abstract length: 500 words",
      "Submission deadline: 15 March 2027",
      "Presentations covering Asset Integrity, AI, Automation & Cybersecurity",
    ],
    actions: [
      { label: "Abstract Submission Details", type: "route", target: "/conferences" },
      { label: "Speak to Programme Team", type: "whatsapp", topicId: "abstracts" },
      { label: "Back to Options", type: "topic", topicId: "initial-options" },
    ],
  },

  "event-details": {
    id: "event-details",
    title: "Event Information",
    text: `AIAIAC Africa 2027 will take place in ${conference.city}, ${conference.country}.`,
    secondaryText: `Dates: ${conference.dates} (22–23 June 2027).\n\nThe conference brings together Asset Integrity, Artificial Intelligence, Automation and Cybersecurity professionals.`,
    bulletPoints: [
      `Venue: ${conference.city}, ${conference.country}`,
      `Dates: 22–23 June 2027`,
      `Theme: "${conference.strapline}"`,
    ],
    actions: [
      { label: "Explore the Conference", type: "route", target: "/about" },
      { label: "Registration Options", type: "route", target: "/registration" },
      { label: "Ask Another Question", type: "topic", topicId: "initial-options" },
    ],
  },

  programme: {
    id: "programme",
    title: "Conference Programme",
    text: "AIAIAC Africa 2027 features four interconnected technical tracks over 2 comprehensive conference days:",
    bulletPoints: [
      "Asset Integrity — Reliability, corrosion control, and life extension",
      "Artificial Intelligence — Digital twins, machine learning, and predictive risk",
      "Automation — IIoT, SCADA, and process control engineering",
      "Cybersecurity — OT cyber-defence and critical infrastructure resilience",
    ],
    actions: [
      { label: "Explore Conference Tracks", type: "route", target: "/conferences" },
      { label: "Speak to Our Team", type: "whatsapp", topicId: "programme" },
      { label: "Back to Options", type: "topic", topicId: "initial-options" },
    ],
  },

  "human-handoff": {
    id: "human-handoff",
    title: "Speak with Our Team",
    text: "Absolutely. I can connect you directly with the AIAIAC team.",
    secondaryText: "Would you like to continue this enquiry on WhatsApp?",
    actions: [
      { label: "Continue on WhatsApp", type: "whatsapp", topicId: "general" },
      { label: "Stay Here / Back to Options", type: "topic", topicId: "initial-options" },
    ],
  },

  unmatched: {
    id: "unmatched",
    title: "Team Enquiry Recommended",
    text: "I may need a member of the AIAIAC team to help with that specific enquiry.",
    secondaryText: "Would you like to connect directly on WhatsApp?",
    actions: [
      { label: "Continue on WhatsApp", type: "whatsapp", topicId: "general" },
      { label: "Ask Something Else", type: "topic", topicId: "initial-options" },
    ],
  },
};

/** Pre-filled WhatsApp Context Message Templates */
export function getWhatsAppHandoffUrl(topicId?: string, queryContext?: string): string {
  let intent: EnquiryIntent = "GENERAL";
  if (topicId === "sponsorship") intent = "SPONSORSHIP";
  else if (topicId === "exhibition") intent = "EXHIBITION";
  else if (topicId === "registration") intent = "DELEGATE";
  else if (topicId === "corporate") intent = "CORPORATE";
  else if (topicId === "abstracts") intent = "ABSTRACT";

  return getWhatsAppEnquiryUrl(intent, queryContext);
}

/** Keyword/Intent Resolver Boundary (AI-ready interface) */
export function resolveAssistantMessage(input: string): AssistantTopicResponse {
  const query = input.toLowerCase().trim();
  const unmatched = topicResponses["unmatched"]!;

  if (!query) {
    return unmatched;
  }

  if (/\b(enquir|inquir|quote|proposal|sales)\b/.test(query)) {
    return topicResponses["enquiry-options"] ?? unmatched;
  }

  if (
    /\b(spon|sponsor|sponsorship|partner|pkg)\b/.test(query) &&
    !/exhibit|stand|booth/.test(query)
  ) {
    return topicResponses["sponsorship"] ?? unmatched;
  }

  if (/\b(exhibit|exhibition|booth|stand|space|sqm)\b/.test(query)) {
    return topicResponses["exhibition"] ?? unmatched;
  }

  if (/\b(abstract|paper|submit|speaker|presentation|call for)\b/.test(query)) {
    return topicResponses["abstracts"] ?? unmatched;
  }

  if (/\b(date|when|where|venue|location|city|country|theme)\b/.test(query)) {
    return topicResponses["event-details"] ?? unmatched;
  }

  if (/\b(register|registration|ticket|pass|cost|fee|attend|delegate)\b/.test(query)) {
    return topicResponses["registration"] ?? unmatched;
  }

  if (
    /\b(prog|program|programme|track|integrity|ai|automation|cyber|topic|schedule)\b/.test(query)
  ) {
    return topicResponses["programme"] ?? unmatched;
  }

  if (/\b(human|person|whatsapp|team|contact|call|phone|email|chat|support)\b/.test(query)) {
    return topicResponses["human-handoff"] ?? unmatched;
  }

  return unmatched;
}
