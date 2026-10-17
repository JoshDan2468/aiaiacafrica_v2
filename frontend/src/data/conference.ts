/**
 * Single source of truth for conference-level copy.
 * Every string here comes from the official AIAIAC Africa material.
 * Values marked PLACEHOLDER are editable and awaiting confirmed data.
 */
export const eventSchedule = {
  startDateISO: "2027-06-22T09:00:00+01:00",
  endDateISO: "2027-06-23T17:00:00+01:00",
  dateRange: "22–23",
  monthAndYear: "June 2027",
  get visibleDate() {
    return `${this.dateRange} ${this.monthAndYear}`;
  },
  location: "Lagos, Nigeria",
} as const;

export const conference = {
  mark: "AIAIAC",
  shortName: "AIAIAC Africa",
  edition: "AIAIAC Africa 2027 Edition",
  title: "Asset Integrity, Automation & Cybersecurity Conference",
  pillarsLine: ["Asset Integrity", "Artificial Intelligence", "Automation", "Cybersecurity"],
  tagline: "Guarding Infrastructure",
  strapline: "Guarding Infrastructure, Powering Innovation, Securing Tomorrow",
  dates: eventSchedule.visibleDate,
  datesShort: eventSchedule.visibleDate.toUpperCase(),
  venue: eventSchedule.location,
  city: "Lagos",
  country: "Nigeria",
  /** Local start: 22 June 2027, 09:00 West Africa Time (UTC+1). */
  startsAtISO: eventSchedule.startDateISO,
  endsAtISO: eventSchedule.endDateISO,
  countdown: {
    targetISO: eventSchedule.startDateISO,
  },
  partnerLine: "In partnership with GExperts Consutoria Limited",
  sectors: ["Oil & Gas", "Maritime", "Heavy Industries", "Utilities"],
  invitation: [
    `The Asset Integrity, Automation & Cybersecurity Conference (AIAIAC Africa 2027) will be held from ${eventSchedule.visibleDate} in ${eventSchedule.location}, serving as a dedicated platform to address the technical challenges of maintaining safe, reliable, and digitally resilient operations in oil and gas. Bringing together operators, EPCs, regulators, and technology providers, the conference will highlight the latest innovations driving operational performance, asset integrity, and industrial resilience.`,
    "AIAIAC Africa is tailored for professionals in integrity management, corrosion control, process safety, automation, and OT cybersecurity. The agenda will highlight advances in inspection and monitoring technologies, digital twins, predictive maintenance, IIoT and SCADA systems, and cyber defense frameworks, supported by regional case studies and global best practices. Delegates will also gain insights into emerging regulatory standards and strategies to balance cost efficiency with sustainability in asset-intensive operations.",
    "We invite you to be part of this strategic gathering, where global expertise meets regional experience, to exchange knowledge, explore solutions, and strengthen collaboration for a safer, smarter, and more resilient future in energy operations.",
  ],
  overview: [
    `AIAIAC Africa 2027, taking place ${eventSchedule.visibleDate} in ${eventSchedule.location}, is the premier platform for addressing the region's most pressing challenges in asset integrity, automation, and industrial cybersecurity. The event brings together professionals in integrity management, process safety, automation, and OT cybersecurity to share insights, explore case studies, and learn from global best practices.`,
    "Featuring two dedicated conference halls — one for Automation & Cybersecurity and another for Asset Integrity — AIAIAC Africa ensures focused discussions on each discipline while providing room to tackle broader challenges in critical infrastructure. A dynamic exhibition hall will showcase the latest technologies transforming the industry.",
    "Attendees will have the opportunity to experience emerging trends firsthand, exchange ideas with peers, contribute insights, participate in technical presentations and panel discussions, and network with key stakeholders shaping the future of energy operations across the region.",
  ],
  conferences: [
    {
      id: "asset-integrity",
      name: "Asset Integrity and Corrosion Conference",
      hall: "Conference Hall 1",
    },
    {
      id: "automation-cybersecurity",
      name: "Automation and Cybersecurity Conference",
      hall: "Conference Hall 2",
    },
  ],
  dualConferenceNote:
    "This dual-conference platform provides an unparalleled opportunity for industry professionals to exchange knowledge, explore cutting-edge solutions, and strengthen collaboration in safeguarding vital energy assets.",
  /** Figures are shown as placeholders until the organiser confirms final numbers. */
  stats: [
    { label: "Conference Delegates", value: "TBC", placeholder: true },
    { label: "Countries", value: "TBC", placeholder: true },
    { label: "Speakers", value: "23", placeholder: false },
    { label: "Exhibitors", value: "TBC", placeholder: true },
  ],
  contact: {
    email: "aiaiac@aiac-africa.com",
    phone: "+234 701 493 4538",
    address: "Lagos, Nigeria",
    organiser: "GExperts Global Events",
    organiserBlurb:
      "GExperts Energy is an international based energy, engineering, business and management consulting firm that focuses on supporting its clients to achieve improved performance through providing pragmatic solution(s).",
    copyright: "All copyrights @aiacafrica",
  },
  /** Official AIAIAC social profiles used by the shared footer. */
  socialMedia: [
    { platform: "Instagram", url: "https://www.instagram.com/aiaiac_africa/" },
    { platform: "LinkedIn", url: "https://lnkd.in/etrvZF9i" },
    { platform: "X", url: "https://x.com/AiaiacAfrica" },
    { platform: "YouTube", url: "https://www.youtube.com/@aiacafrica" },
    { platform: "Facebook", url: "https://www.facebook.com/aiac.africa" },
    { platform: "TikTok", url: "https://vm.tiktok.com/ZS9B2jJraoyyW-2SgRm/" },
  ],
} as const;

export const navigation = [
  { label: "About", href: "/#about" },
  { label: "Conference", href: "/#programme" },
  { label: "Speakers", href: "/#speakers" },
  { label: "Exhibition", href: "/#exhibition" },
  { label: "Sponsors", href: "/#sponsors" },
  { label: "Media", href: "/#media" },
  { label: "Contact", href: "/#contact" },
];

export const quickLinks = [
  "Home",
  "Cybersecurity",
  "Asset Conference",
  "Exhibitor Profile",
  "Participate",
  "Visit Us",
  "Exhibitor Enquiry",
  "Sponsorship Enquiry",
  "Download Brochure",
];
