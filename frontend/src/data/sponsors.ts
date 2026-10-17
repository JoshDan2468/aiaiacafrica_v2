import type { Sponsor, SponsorTier } from "@/types";

const img = (id: string) => `https://framerusercontent.com/images/${id}`;

/** Current sponsors explicitly confirmed for publication by the organiser. */
export const confirmedSponsors: readonly {
  id: string;
  name: string;
  tier: "diamond" | "silver";
  logo: string;
}[] = [
  {
    id: "candid-oil",
    name: "Candid Oil Services",
    tier: "diamond",
    logo: "/assets/aiaiac-2027/sponsors/candid-oil.jpg",
  },
  {
    id: "gasavant-africa",
    name: "Gasavant Africa",
    tier: "silver",
    logo: "/assets/aiaiac-2027/sponsors/gasavant-africa.jpg",
  },
  {
    id: "sesto-elemento",
    name: "Sesto Elemento Services Limited",
    tier: "silver",
    logo: "/assets/aiaiac-2027/sponsors/sesto-elemento.png",
  },
];

export const sponsorTiers: SponsorTier[] = [
  { id: "associate", label: "Associate Sponsor", archivePath: "/sponsorship/associate-sponsor" },
  { id: "knowledge", label: "Knowledge Partner", archivePath: "/sponsorship/knowledge-partner" },
  { id: "exhibitor", label: "Exhibitors", archivePath: "/sponsorship/exhibitors" },
  {
    id: "supporting",
    label: "Supporting Partners",
    archivePath: "/sponsorship/supporting-partners",
  },
  { id: "media", label: "Media Partners", archivePath: "/sponsorship/media-partners" },
];

/**
 * Public media partners only. Unpaid sponsor, exhibitor and supporting-partner
 * listings are withheld until the organiser confirms their publication.
 */
export const sponsors: Sponsor[] = [
  { id: "med-1", tier: "media", logo: img("ysntJeGh19z3ypwPQFSRrpLJ00.png") },
  { id: "med-2", tier: "media", logo: img("0hWm3kPxm057Mj9z5eYZm17Nk9A.png") },
  { id: "med-3", tier: "media", logo: img("OgSjNu8aYOUaafXDRMvHJRIlI.jpeg") },
  { id: "med-4", tier: "media", logo: img("4Vh1CR6pXtlW3ykzP019ayZY2CY.png") },
  {
    id: "med-5",
    tier: "media",
    logo: img("8YDJk8V0SL8VFHWRhf6btET6EI.png"),
    name: "Energy Business Review",
  },
  {
    id: "med-6",
    tier: "media",
    logo: img("Y8CF8Z0FlYl1KdCalzZ9di3w.png"),
    name: "Oilfield Africa Review",
  },
  {
    id: "med-8",
    tier: "media",
    logo: img("Y5WppbTMLDvVLXJZnKaRi0by4Ew.png"),
    name: "Inspectioneering",
  },
];

export const organiserLogo = img("K9X6X1fitHlNG28Lhh2uZy14aTg.png");
