/**
 * Approved brochure-facing content for public presentation only.
 * These records are deliberately read-only: they do not enable payments,
 * bookings, submissions, quotations, or any backend workflow.
 */

export const abstractSubmissionGuidance = {
  deadline: "15 March 2027",
  maximumWords: 500,
  requiredDetails: [
    "Paper title",
    "Author(s)",
    "Professional affiliation",
    "Mailing address",
    "Email",
  ],
  reviewCriteria: [
    "Originality",
    "Technical relevance",
    "Practical value",
    "Likely delegate interest",
  ],
  speakerFee: "To Be Announced upon confirmation and acceptance",
  contactEmail: "aiaiac@aiac-africa.com",
  contactNotice:
    "Brochure source variants use different registration emails. The published AIAIAC Africa contact remains subject to organiser confirmation.",
} as const;

export const abstractTopics = [
  "Asset Integrity & Reliability",
  "Corrosion & Materials",
  "Digital Integrity & AI",
  "Automation & Control",
  "OT/ICS Cybersecurity",
  "Threat, Risk & Resilience",
] as const;

export type BrochurePackage = {
  id: string;
  code?: string;
  title: string;
  priceLabel?: string;
  priceMinor?: number;
  detail?: string;
  scope?: string;
  highlights?: readonly string[];
};

export type BrochurePricePackage = BrochurePackage;

export const sponsorshipPackages: readonly BrochurePackage[] = [
  {
    id: "title",
    code: "TITLE",
    title: "Title Sponsor",
    priceLabel: "USD 100,000",
    priceMinor: 10000000,
    scope: "Supreme Event Leadership",
    highlights: [
      "45 sqm shell scheme exhibition booth",
      "12 VIP delegate passes and 10 VIP exhibitor passes",
      "Strategic panel moderator and 25-minute speaking slot",
      "40% discount on additional delegate registration",
    ],
  },
  {
    id: "strategic",
    code: "STRATEGIC",
    title: "Strategic Sponsor",
    priceLabel: "USD 75,000",
    priceMinor: 7500000,
    scope: "Strategic Industry Partner",
    highlights: [
      "45 sqm shell scheme exhibition booth",
      "10 VIP delegate passes and 8 VIP exhibitor passes",
      "Strategic panel moderator and 25-minute speaking slot",
      "35% discount on additional delegate registration",
    ],
  },
  {
    id: "diamond",
    code: "DIAMOND",
    title: "Diamond Sponsor",
    priceLabel: "USD 50,000",
    priceMinor: 5000000,
    scope: "Diamond Pillar Partner",
    highlights: [
      "36 sqm shell scheme exhibition booth",
      "10 VIP delegate passes and 6 VIP exhibitor passes",
      "25-minute speaking slot",
      "30% discount on additional delegate registration",
    ],
  },
  {
    id: "platinum",
    code: "PLATINUM",
    title: "Platinum Sponsor",
    priceLabel: "USD 40,000",
    priceMinor: 4000000,
    scope: "Platinum Partner",
    highlights: [
      "18 sqm shell scheme exhibition booth",
      "8 VIP delegate passes and 4 VIP exhibitor passes",
      "Conference show guide and official website branding",
      "25% discount on additional delegate registration",
    ],
  },
  {
    id: "gold",
    code: "GOLD",
    title: "Gold Sponsor",
    priceLabel: "USD 30,000",
    priceMinor: 3000000,
    scope: "Gold Partner",
    highlights: [
      "9 sqm shell scheme exhibition booth",
      "6 VIP delegate passes and 2 VIP exhibitor passes",
      "25-minute speaking slot",
      "20% discount on additional delegate registration",
    ],
  },
  {
    id: "silver",
    code: "SILVER",
    title: "Silver Sponsor",
    priceLabel: "USD 20,000",
    priceMinor: 2000000,
    scope: "Silver Partner",
    highlights: [
      "9 sqm shell scheme exhibition booth",
      "4 VIP delegate passes and 2 VIP exhibitor passes",
      "Conference show guide and official website branding",
      "15% discount on additional delegate registration",
    ],
  },
];

export const exhibitionStandPackages: readonly BrochurePackage[] = [
  {
    id: "9sqm",
    code: "9_SQM",
    title: "9 sqm stand",
    priceLabel: "USD 6,990",
    priceMinor: 699000,
    detail: "Standard Single Booth",
    scope: "Specialized technology and service demonstrations",
    highlights: [
      "Fitted aluminium shell scheme",
      "2 Exhibitor passes with conference access",
      "Company fascia board & lighting",
      "Listing in official exhibition directory",
    ],
  },
  {
    id: "18sqm",
    code: "18_SQM",
    title: "18 sqm stand",
    priceLabel: "USD 13,980",
    priceMinor: 1398000,
    detail: "Double Booth Space",
    scope: "Enhanced floor presence for hardware & software displays",
    highlights: [
      "Double shell scheme configuration",
      "4 Exhibitor passes with conference access",
      "Dual fascia nameboards & power",
      "Official directory & digital catalogue feature",
    ],
  },
  {
    id: "36sqm",
    code: "36_SQM",
    title: "36 sqm stand",
    priceLabel: "USD 27,960",
    priceMinor: 2796000,
    detail: "Premier Island Space",
    scope: "Maximum industry visibility for machinery & interactive demos",
    highlights: [
      "Prime island or corner positioning",
      "8 Exhibitor passes with conference access",
      "Custom build flexibility or shell scheme",
      "Priority media & buyer tour inclusion",
    ],
  },
];

export const exhibitionShellSchemeItems = [
  "Aluminium structure with white infill",
  "Fascia company name",
  "Brochure rack",
  "Information counter",
  "Two chairs",
  "One table",
  "Waste basket",
  "13A power socket",
  "Extension cord",
  "Three track spotlights",
] as const;

export const corporateGroupDelegatePackages: readonly BrochurePackage[] = [
  {
    id: "group-gold",
    title: "Gold Group Pass",
    detail: "15 Passes",
    scope: "Full-organisation technical delegation",
    highlights: [
      "15 Full conference access passes",
      "Priority seating in plenary sessions",
      "Access to all technical tracks & exhibition floor",
      "Corporate recognition in delegate materials",
    ],
  },
  {
    id: "group-silver",
    title: "Silver Group Pass",
    detail: "10 Passes",
    scope: "Senior technical and engineering team",
    highlights: [
      "10 Full conference access passes",
      "Access to all technical tracks & exhibition floor",
      "Dedicated corporate check-in desk",
      "Networking reception access",
    ],
  },
  {
    id: "group-bronze",
    title: "Bronze Group Pass",
    detail: "5 Passes",
    scope: "Specialized project team",
    highlights: [
      "5 Full conference access passes",
      "Access to all technical tracks & exhibition floor",
      "Full access to conference technical proceedings",
    ],
  },
];

export const exhibitionCategories = [
  "Asset Integrity & NDT",
  "Corrosion & Coatings",
  "Maintenance & Reliability",
  "Automation & Instrumentation",
  "AI & Digital Transformation",
  "Cybersecurity",
] as const;

export const conferenceExperience = [
  "Executive Keynote Sessions",
  "Four Specialised Conference Tracks",
  "Technical Presentations",
  "Innovation Showcase",
  "Exhibition",
  "Executive Roundtables",
  "Strategic Networking",
] as const;

export const approvedAudiences = [
  "Asset Owners & Operators",
  "Government & Regulators",
  "Oil, Gas & Energy Companies",
  "Maritime & Heavy Industries",
  "AI & Technology Companies",
  "Engineering & Maintenance Providers",
  "Cybersecurity & Automation Specialists",
] as const;

export const aiaiacAfricaChallenges = [
  "Ageing Infrastructure",
  "Rising Operating Costs",
  "Rapid AI Adoption",
  "Growing Cybersecurity Threats",
  "Demand for Safer & More Efficient Operations",
  "Need for Local Skills, Technology & Investment",
] as const;
