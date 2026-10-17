import type { RegistrationOption } from "@/types";

export type RegistrationPaymentMode = "direct-payment" | "enquiry-first" | "free";

export type RegistrationCategoryId =
  | "delegate"
  | "exhibitor"
  | "sponsorship"
  | "visitor"
  | "media-partnership"
  | "abstract-submissions";

export type RegistrationPackage = {
  id: string;
  name: string;
  description: string;
  availability: string;
  price: number | null;
  currency: string | null;
  priceLabel: string;
  quantityLabel?: "registration" | "stand";
};

export type RegistrationJourney = {
  id: RegistrationCategoryId;
  title: string;
  shortTitle: string;
  description: string;
  paymentMode: RegistrationPaymentMode;
  handoffLabel: string;
  packages: RegistrationPackage[];
};

export type RegistrationLandingOption = {
  id: RegistrationCategoryId | "download-centre";
  title: string;
  description: string;
  availability: string;
  cta: string;
  action: { type: "journey"; categoryId: RegistrationCategoryId } | { type: "download-centre" };
  presentation: "delegate" | "active" | "pending" | "abstract";
};

/**
 * Transitional legacy options. These stay intact for the existing registration
 * form components, which are deliberately not part of the new client-only flow.
 */
export const registrationOptions: RegistrationOption[] = [
  {
    id: "delegate",
    intent: "delegate",
    title: "Delegate Registration",
    description:
      "Enhance your knowledge, build strategic connections, and discover actionable ideas to drive success in your field by attending insightful sessions and networking events.",
    benefits: [
      "Technical knowledge exchange",
      "Industry peer connections",
      "Expert-led discussion",
      "Technology discovery",
    ],
    cta: "Prepare delegate details",
    route: "/registration/delegate",
  },
  {
    id: "exhibitor",
    intent: "exhibitor",
    title: "Exhibitor Enquiry",
    description:
      "Showcase your latest products and innovations to a targeted audience, gain valuable leads, and boost brand visibility at the industry's leading exhibition.",
    benefits: [
      "Technology showcase enquiry",
      "Industry audience connection",
      "Brand visibility conversation",
      "Participation details to follow",
    ],
    cta: "Prepare exhibitor enquiry",
    route: "/registration/exhibitor",
  },
  {
    id: "sponsor",
    intent: "sponsor",
    title: "Sponsor Enquiry",
    description:
      "Maximize your brand exposure, position your company as a market leader, and connect with decision-makers through high-impact sponsorship opportunities.",
    benefits: [
      "Technical audience alignment",
      "Industry visibility conversation",
      "Partnership enquiry route",
      "Package details to follow",
    ],
    cta: "Prepare sponsor enquiry",
    route: "/registration/sponsor",
  },
];

/**
 * The single source of truth for the frontend-only registration desk. Prices
 * and currencies are intentionally unconfirmed: no UI may infer an amount.
 */
export const registrationJourneys: RegistrationJourney[] = [
  {
    id: "delegate",
    title: "Delegate registration",
    shortTitle: "Delegate",
    description: "Prepare your delegate details for the AIAIAC technical programme.",
    paymentMode: "direct-payment",
    handoffLabel: "Proceed to secure payment",
    packages: [
      {
        id: "delegate-registration",
        name: "Delegate registration",
        description: "Technical programme participation details are being confirmed.",
        availability: "Registration details can be prepared",
        price: null,
        currency: null,
        priceLabel: "Direct Delegate Registration",
        quantityLabel: "registration",
      },
    ],
  },
  {
    id: "exhibitor",
    title: "Book a stand / exhibitor",
    shortTitle: "Exhibitor",
    description: "Prepare an exhibition enquiry and organisation record.",
    paymentMode: "direct-payment",
    handoffLabel: "Proceed to secure payment",
    packages: [
      {
        id: "exhibitor-enquiry",
        name: "Book a stand / exhibitor",
        description: "A tailored exhibition quotation is required before any payment can begin.",
        availability: "Custom quotation required",
        price: null,
        currency: null,
        priceLabel: "Custom Exhibition Quotation",
        quantityLabel: "stand",
      },
    ],
  },
  {
    id: "sponsorship",
    title: "Sponsorship",
    shortTitle: "Sponsorship",
    description: "Prepare a sponsorship enquiry for discussion with the organising team.",
    paymentMode: "enquiry-first",
    handoffLabel: "Prepare sponsorship enquiry",
    packages: [
      {
        id: "sponsorship-enquiry",
        name: "Sponsorship enquiry",
        description:
          "A tailored sponsorship proposal must be discussed and approved by the organising team.",
        availability: "Tailored proposal required",
        price: null,
        currency: null,
        priceLabel: "Custom Sponsorship Proposal",
      },
    ],
  },
  {
    id: "visitor",
    title: "Visitor registration",
    shortTitle: "Visitor",
    description: "Prepare visitor information while availability and pricing are confirmed.",
    paymentMode: "enquiry-first",
    handoffLabel: "Prepare visitor application",
    packages: [
      {
        id: "visitor-registration",
        name: "Visitor registration",
        description:
          "Visitor availability and registration criteria are confirmed upon application.",
        availability: "Application details can be prepared",
        price: null,
        currency: null,
        priceLabel: "Visitor Accreditation",
      },
    ],
  },
  {
    id: "media-partnership",
    title: "Media partnership",
    shortTitle: "Media",
    description: "Prepare a media partnership request for the communications team.",
    paymentMode: "enquiry-first",
    handoffLabel: "Prepare media request",
    packages: [
      {
        id: "media-partnership-request",
        name: "Media partnership request",
        description: "Editorial scope and accreditation arrangements require organiser review.",
        availability: "Application details can be prepared",
        price: null,
        currency: null,
        priceLabel: "Media Accreditation",
      },
    ],
  },
  {
    id: "abstract-submissions",
    title: "Abstract submissions",
    shortTitle: "Abstract",
    description: "Prepare an abstract submission request for the technical programme.",
    paymentMode: "enquiry-first",
    handoffLabel: "Prepare abstract request",
    packages: [
      {
        id: "abstract-submission-request",
        name: "Abstract submission request",
        description:
          "The call for abstracts and review process are open for technical programme consideration.",
        availability: "Application details can be prepared",
        price: null,
        currency: null,
        priceLabel: "Abstract Review Submission",
      },
    ],
  },
];

export const registrationLandingOptions: RegistrationLandingOption[] = [
  {
    id: "delegate",
    title: "Delegate registration",
    description:
      "Join the technical exchange, specialist sessions and peer conversations shaping resilient operations.",
    availability: "Details open",
    cta: "Start delegate registration",
    action: { type: "journey", categoryId: "delegate" },
    presentation: "delegate",
  },
  {
    id: "exhibitor",
    title: "Book a stand / exhibitor",
    description:
      "Place your technology, services and expertise in front of operational decision-makers.",
    availability: "Details open",
    cta: "Prepare exhibitor enquiry",
    action: { type: "journey", categoryId: "exhibitor" },
    presentation: "active",
  },
  {
    id: "sponsorship",
    title: "Sponsorship",
    description: "Create a credible partnership presence around the AIAIAC technical programme.",
    availability: "Details open",
    cta: "Prepare sponsorship enquiry",
    action: { type: "journey", categoryId: "sponsorship" },
    presentation: "active",
  },
  {
    id: "visitor",
    title: "Visitor registration",
    description:
      "Prepare visitor information while attendance availability and pricing are being confirmed.",
    availability: "Details open",
    cta: "Prepare visitor details",
    action: { type: "journey", categoryId: "visitor" },
    presentation: "pending",
  },
  {
    id: "media-partnership",
    title: "Media partnership",
    description:
      "Prepare an accreditation or editorial partnership request for organising-team review.",
    availability: "Details open",
    cta: "Prepare media request",
    action: { type: "journey", categoryId: "media-partnership" },
    presentation: "pending",
  },
  {
    id: "download-centre",
    title: "Download centre",
    description:
      "Programme, prospectus and participation materials will be published here as they are approved.",
    availability: "Documents pending",
    cta: "View planned documents",
    action: { type: "download-centre" },
    presentation: "pending",
  },
  {
    id: "abstract-submissions",
    title: "Abstract submissions",
    description:
      "Prepare a submission request while the call for abstracts is confirmed with the technical programme.",
    availability: "Details open",
    cta: "Prepare abstract request",
    action: { type: "journey", categoryId: "abstract-submissions" },
    presentation: "abstract",
  },
];

export function findRegistrationJourney(id: RegistrationCategoryId) {
  return registrationJourneys.find((journey) => journey.id === id);
}
