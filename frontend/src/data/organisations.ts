/**
 * Central Organisation Registry for AIAIAC Africa 2027.
 *
 * Reusable organisation metadata, normalisation, alias resolution,
 * and verified filesystem logo asset bindings.
 *
 * Rules:
 * 1. Logo paths MUST come from real assets existing in public/.
 * 2. Country flags are separate metadata (countryCode) and must NOT be derived from organisationKey.
 * 3. Organizations without a verified logo return undefined so UI falls back cleanly to typography.
 */

export interface Organisation {
  name: string;
  shortName?: string;
  logo?: string;
  aspect?: "square" | "wide";
}

/**
 * Normalises an organisation or company string for consistent key lookup.
 * Handles casing, legal suffixes (Ltd, Limited, Inc, etc.), special characters,
 * punctuation, and spacing.
 */
export function normalizeOrganisationName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\.(svg|webp|png|jpe?g)$/i, "")
    .replace(/&/g, " and ")
    .replace(/[(),.'’"“”/–-]/g, " ")
    .replace(/\b(limited|ltd|plc|inc|incorporated|company|corp|corporation|companies)\b/g, " ")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Controlled alias map binding naming variants and normalised forms
 * to the canonical organisation key.
 */
export const organisationAliases: Record<string, string> = {
  // Shell variants
  shell: "shell",
  "shell-nigeria": "shell",
  "shell-usa": "shell",
  "shell-nigeria-exploration-and-production": "shell",
  "shell-nigeria-exploration-and-production-company-snepco": "shell",
  "shell-nigeria-exploration-and-production-snepco": "shell",
  snepco: "shell",

  // NLNG variants
  nlng: "nlng",
  "nigeria-lng": "nlng",
  "nigerian-lng": "nlng",
  "nigeria-lng-limited": "nlng",
  "nigerian-lng-limited": "nlng",

  // AGPC / ANOH Gas variants
  anoh: "anoh",
  agpc: "anoh",
  "anoh-gas": "anoh",
  "anoh-gas-processing": "anoh",
  "anoh-gas-processing-agpc": "anoh",
  "anoh-gas-processing-company": "anoh",
  "anoh-gas-processing-company-limited": "anoh",
  "anoh-gas-processing-company-agpc": "anoh",

  // Seplat variants
  seplat: "seplat",
  "seplat-energy": "seplat",

  // TotalEnergies variants
  totalenergies: "totalenergies",
  "totalenergies-nigeria": "totalenergies",
  "total-energies": "totalenergies",

  // ExxonMobil variants
  exxonmobil: "exxonmobil",
  "exxonmobil-nigeria": "exxonmobil",
  "exxon-mobil": "exxonmobil",

  // NNPC / NGIC variants
  nnpc: "nnpc",
  "nnpc-gas-infrastructure": "nnpc",
  "nigeria-gas-infrastructure": "nnpc",
  "nigeria-gas-infrastructure-company": "nnpc",
  "nnpc-gas-infrastructure-company-limited": "nnpc",
  "nigerian-national-petroleum-company": "nnpc",

  // Renaissance variants
  renaissance: "renaissance",
  "renaissance-africa": "renaissance",
  "renaissance-africa-energy": "renaissance",
  "renaissance-africa-energy-company": "renaissance",
  "renaissance-africa-energy-company-limited": "renaissance",

  // CSEAN variants
  csean: "csean",
  "cybersecurity-experts-association-of-nigeria": "csean",
  "cybersecurity-experts-association-of-nigeria-csean": "csean",

  // Pan Ocean variants
  "pan-ocean": "pan-ocean",
  "pan-ocean-and-newcross": "pan-ocean",
  "pan-ocean-and-newcross-companies": "pan-ocean",
  "pan-ocean-oil-nigeria": "pan-ocean",
  "pan-ocean-oil-corporation-nigeria-limited": "pan-ocean",

  // Cenosco variants
  cenosco: "cenosco",
  "cenosco-netherlands": "cenosco",

  // BP variants
  bp: "bp",
  "bp-petroleum": "bp",
  "british-petroleum": "bp",

  // FUTA variants
  futa: "futa",
  "federal-university-of-technology-akure": "futa",
  "the-federal-university-of-technology-akure": "futa",

  // AGIP variants
  agip: "agip",
  "agip-nigeria": "agip",

  // ADNOC variants
  adnoc: "adnoc",
  "abu-dhabi-national-oil-company": "adnoc",

  // AIE variants
  aie: "aie",
  "asset-integrity-engineering": "aie",
  "asset-integrity-engineering-aie": "aie",

  // Alpha Echo Energy
  "alpha-echo-energy": "alpha-echo-energy",
  "alpha-echo-energy-limited": "alpha-echo-energy",

  // Aramco variants
  aramco: "aramco",
  "saudi-aramco": "aramco",

  // Arridex
  arridex: "arridex",

  // ASB Valiant
  "asb-valiant": "asb-valiant",
  "asb-valiant-company-limited": "asb-valiant",
  asb: "asb-valiant",

  // Atlantic LNG
  "atlantic-lng": "atlantic-lng",
  "atlanta-cng": "atlantic-lng",

  // Avetium
  avetium: "avetium",
  "avetium-holdco": "avetium",
  "avetium-technologies": "avetium",

  // BataBank
  batabank: "batabank",
  "batabank-ai-usa": "batabank",

  // BG Technical
  "bg-technical": "bg-technical",
  bgt: "bg-technical",
  "bg-technical-ltd": "bg-technical",

  // Candid Oil
  "candid-oil": "candid-oil",
  candidoil: "candid-oil",

  // CESRA
  cesra: "cesra",
  "center-for-space-research-and-applications": "cesra",

  // Dangote
  dangote: "dangote",
  "dangote-petroleum-and-petrochemicals": "dangote",
  "dangote-petroleum-refinery-and-petrochemicals": "dangote",

  // Daptem
  daptem: "daptem",
  "daptem-engineering": "daptem",

  // Fertiglobe
  fertiglobe: "fertiglobe",

  // GExperts Energy
  gexperts: "gexperts",
  "gexperts-energy": "gexperts",
  "gexperts-energy-limited": "gexperts",

  // Ghana Gas
  "ghana-gas": "ghana-gas",
  "ghana-national-gas": "ghana-gas",
  "ghana-national-gas-limited-company": "ghana-gas",

  // HAMWALTECH
  hamwaltech: "hamwaltech",
  "hamwaltech-solutions": "hamwaltech",

  // Hitachi Energy
  hitachi: "hitachi",
  "hitachi-energy": "hitachi",

  // Jotun
  jotun: "jotun",
  "jotun-nigeria": "jotun",

  // MERITECH
  meritech: "meritech",
  "meritech-ltd": "meritech",

  // Moduslights
  moduslights: "moduslights",
  "moduslights-technologies": "moduslights",
  "moduslight-technology": "moduslights",

  // Navante
  navante: "navante",
  "navante-oil-and-gas": "navante",
  "navante-oil-and-gas-company-limited": "navante",

  // Orashi
  orashi: "orashi",
  "orashi-petroleum": "orashi",
  "orashi-petroleum-development": "orashi",
  "orashi-petroleum-development-company-limited": "orashi",

  // Petroco
  petroco: "petroco",
  "petroco-and-engineering": "petroco",

  // Phenomenal Energy
  "phenomenal-energy": "phenomenal-energy",
  "phenomenal-energy-limited": "phenomenal-energy",

  // PTDF
  ptdf: "ptdf",
  "petroleum-technology-development-fund": "ptdf",

  // PTI
  pti: "pti",
  "petroleum-training-institute": "pti",

  // Sonangol
  sonangol: "sonangol",

  // SPE
  spe: "spe",
  "spe-international": "spe",
  "spe-international-gulf-coast-section": "spe",

  // Tranter IT
  "tranter-it": "tranter-it",
  "tranter-it-infrastructure": "tranter-it",
  tranter: "tranter-it",

  // UUM
  uum: "uum",
  "university-utara-malaysia": "uum",
  "universiti-utara-malaysia": "uum",
  "university-utara-malaysia-uum": "uum",

  // Awaiting assets aliases
  "add-value-consultancy": "add-value-consultancy",
  dpfluiteq: "dpfluiteq",
  enatlas: "enatlas",
  "co-founder-of-enatlas": "enatlas",
  haslund: "haslund",
  "haslund-trading": "haslund",
  mcalpha: "mcalpha",
  "mcalpha-inc": "mcalpha",
  nexridge: "nexridge",
  "nexridge-limited": "nexridge",
  nuprc: "nuprc",
  "nigerian-upstream-petroleum-regulatory-commission": "nuprc",
  "nigerian-upstream-petroleum-regulatory-commission-nuprc": "nuprc",
  "platform-petroleum": "platform-petroleum",
  "platform-petroleum-limited": "platform-petroleum",
  seapack: "seapack",
  "seapack-ventures": "seapack",
  "seapack-ventures-ltd": "seapack",
  "transition-maritime": "transition-maritime",
  "verte-energies": "verte-energies",
  "verte-energies-ltd": "verte-energies",
};

/**
 * Central registry of all known organisations.
 * Logos strictly point to real verified files in frontend/public/assets/aiaiac-2027/logos or /brand.
 */
export const organisations: Record<string, Organisation> = {
  // --- ORGANISATIONS WITH VERIFIED LOGOS IN ASSET DIRECTORY ---
  adnoc: {
    name: "Abu Dhabi National Oil Company",
    shortName: "ADNOC",
    logo: "/assets/aiaiac-2027/logos/Adnoc.png",
    aspect: "square",
  },
  agip: {
    name: "AGIP Nigeria",
    shortName: "AGIP",
    logo: "/assets/aiaiac-2027/logos/agip.jpg",
    aspect: "wide",
  },
  aie: {
    name: "Asset Integrity Engineering",
    shortName: "AIE",
    logo: "/assets/aiaiac-2027/logos/AIE.png",
    aspect: "wide",
  },
  "alpha-echo-energy": {
    name: "Alpha Echo Energy Limited",
    shortName: "Alpha Echo Energy",
    logo: "/assets/aiaiac-2027/logos/alpha.png",
    aspect: "wide",
  },
  anoh: {
    name: "ANOH Gas Processing Company Limited",
    shortName: "AGPC",
    logo: "/assets/aiaiac-2027/logos/ANOH.png",
    aspect: "wide",
  },
  agpc: {
    name: "ANOH Gas Processing Company Limited",
    shortName: "AGPC",
    logo: "/assets/aiaiac-2027/logos/ANOH.png",
    aspect: "wide",
  },
  aramco: {
    name: "Aramco",
    logo: "/assets/aiaiac-2027/logos/aramco.jpg",
    aspect: "wide",
  },
  arridex: {
    name: "Arridex",
    logo: "/assets/aiaiac-2027/logos/arridex.jpg",
    aspect: "wide",
  },
  "asb-valiant": {
    name: "ASB Valiant Company Limited",
    shortName: "ASB Valiant",
    logo: "/assets/aiaiac-2027/logos/asb.jpg",
    aspect: "square",
  },
  "atlantic-lng": {
    name: "Atlantic LNG",
    logo: "/assets/aiaiac-2027/logos/atlanta-CNG.png",
    aspect: "square",
  },
  avetium: {
    name: "Avetium Holdco",
    shortName: "Avetium",
    logo: "/assets/aiaiac-2027/logos/avetium-technologies.jpg",
    aspect: "square",
  },
  "bg-technical": {
    name: "BG Technical Ltd",
    shortName: "BGT",
    logo: "/assets/aiaiac-2027/logos/BGT.jpg",
    aspect: "wide",
  },
  bp: {
    name: "British Petroleum",
    shortName: "BP",
    logo: "/assets/aiaiac-2027/logos/BP-Logo.wine.png",
    aspect: "wide",
  },
  "candid-oil": {
    name: "Candid Oil",
    logo: "/assets/aiaiac-2027/logos/candidoil.png",
    aspect: "wide",
  },
  cenosco: {
    name: "Cenosco",
    shortName: "Cenosco",
    logo: "/assets/aiaiac-2027/logos/cenosco.png",
    aspect: "wide",
  },
  cesra: {
    name: "Center for Space Research and Applications",
    shortName: "CESRA",
    logo: "/assets/aiaiac-2027/logos/cesra.jpg",
    aspect: "wide",
  },
  csean: {
    name: "Cybersecurity Experts Association of Nigeria",
    shortName: "CSEAN",
    logo: "/assets/aiaiac-2027/logos/CSEAN.jpg",
    aspect: "square",
  },
  dangote: {
    name: "Dangote Petroleum and Petrochemicals",
    shortName: "Dangote",
    logo: "/assets/aiaiac-2027/logos/dangote.png",
    aspect: "wide",
  },
  daptem: {
    name: "Daptem Engineering",
    shortName: "Daptem",
    logo: "/assets/aiaiac-2027/logos/daptem.jpg",
    aspect: "square",
  },
  exxonmobil: {
    name: "ExxonMobil",
    logo: "/assets/aiaiac-2027/logos/ExxonMobil-Logo.wine.png",
    aspect: "wide",
  },
  fertiglobe: {
    name: "Fertiglobe",
    logo: "/assets/aiaiac-2027/logos/fertiglobe.png",
    aspect: "wide",
  },
  futa: {
    name: "Federal University of Technology, Akure",
    shortName: "FUTA",
    logo: "/assets/aiaiac-2027/logos/futa.jpg",
    aspect: "square",
  },
  gexperts: {
    name: "GExperts Energy Limited",
    shortName: "GExperts Energy",
    logo: "/brand/gexpert-main.png",
    aspect: "wide",
  },
  "ghana-gas": {
    name: "Ghana National Gas Limited Company",
    shortName: "Ghana Gas",
    logo: "/assets/aiaiac-2027/logos/ghana-gas-limited.jpg",
    aspect: "wide",
  },
  hamwaltech: {
    name: "HAMWALTECH SOLUTIONS",
    shortName: "HAMWALTECH",
    logo: "/assets/aiaiac-2027/logos/hamwaltechsolution.jpg",
    aspect: "square",
  },
  hitachi: {
    name: "Hitachi Energy",
    logo: "/assets/aiaiac-2027/logos/hitachi-energy-logo.png",
    aspect: "wide",
  },
  jotun: {
    name: "Jotun",
    logo: "/assets/aiaiac-2027/logos/jotun-logo-png_seeklogo-76141.png",
    aspect: "square",
  },
  meritech: {
    name: "MERITECH LTD",
    shortName: "Meritech",
    logo: "/assets/aiaiac-2027/logos/meritech.jpg",
    aspect: "wide",
  },
  moduslights: {
    name: "Moduslights Technologies",
    logo: "/assets/aiaiac-2027/logos/moduslight-technology.jpg",
    aspect: "square",
  },
  navante: {
    name: "Navante Oil & Gas Company Limited",
    shortName: "Navante",
    logo: "/assets/aiaiac-2027/logos/navante_oil_gas_company_limited_logo.jpg",
    aspect: "square",
  },
  nlng: {
    name: "Nigeria LNG Limited",
    shortName: "NLNG",
    logo: "/assets/aiaiac-2027/logos/nlng.jpg",
    aspect: "square",
  },
  nnpc: {
    name: "Nigerian National Petroleum Company",
    shortName: "NNPC",
    logo: "/assets/aiaiac-2027/logos/NNPC.png",
    aspect: "wide",
  },
  orashi: {
    name: "Orashi Petroleum Development Company Limited",
    shortName: "Orashi",
    logo: "/assets/aiaiac-2027/logos/orashi.jpg",
    aspect: "wide",
  },
  "pan-ocean": {
    name: "Pan Ocean and Newcross Companies",
    shortName: "Pan Ocean",
    logo: "/assets/aiaiac-2027/logos/pan_ocean_oil_corporation_nigeria_limited_logo.jpg",
    aspect: "square",
  },
  petroco: {
    name: "Petroco and Engineering",
    shortName: "Petroco",
    logo: "/assets/aiaiac-2027/logos/petroco.png",
    aspect: "square",
  },
  "phenomenal-energy": {
    name: "Phenomenal Energy Limited",
    shortName: "Phenomenal Energy",
    logo: "/assets/aiaiac-2027/logos/phenomenal_energy_nigeria_limited_logo.jpg",
    aspect: "square",
  },
  ptdf: {
    name: "Petroleum Technology Development Fund",
    shortName: "PTDF",
    logo: "/assets/aiaiac-2027/logos/PTDF.jpg",
    aspect: "square",
  },
  pti: {
    name: "Petroleum Training Institute",
    shortName: "PTI",
    logo: "/assets/aiaiac-2027/logos/pti.jpg",
    aspect: "square",
  },
  renaissance: {
    name: "Renaissance Africa Energy Company Limited",
    shortName: "Renaissance",
    logo: "/assets/aiaiac-2027/logos/Renaissance-Consortium.png",
    aspect: "wide",
  },
  seplat: {
    name: "Seplat Energy",
    shortName: "Seplat",
    logo: "/assets/aiaiac-2027/logos/Seplat-Energy.png",
    aspect: "wide",
  },
  shell: {
    name: "Shell",
    logo: "/assets/aiaiac-2027/logos/Shell_logo.svg.webp",
    aspect: "square",
  },
  sonangol: {
    name: "Sonangol",
    logo: "/assets/aiaiac-2027/logos/sonangol-logo-png_seeklogo-435144.png",
    aspect: "square",
  },
  spe: {
    name: "SPE International Gulf Coast Section",
    shortName: "SPE",
    logo: "/assets/aiaiac-2027/logos/images.png",
    aspect: "wide",
  },
  totalenergies: {
    name: "TotalEnergies",
    logo: "/assets/aiaiac-2027/logos/totalenergies.jpg",
    aspect: "wide",
  },
  "tranter-it": {
    name: "Tranter IT Infrastructure",
    shortName: "Tranter IT",
    logo: "/assets/aiaiac-2027/logos/tranter.png",
    aspect: "square",
  },
  uum: {
    name: "University Utara Malaysia",
    shortName: "UUM",
    logo: "/assets/aiaiac-2027/logos/uum.png",
    aspect: "wide",
  },

  // --- ORGANISATIONS CURRENTLY AWAITING LOGO ASSETS ---
  "add-value-consultancy": {
    name: "Add Value Consultancy",
  },
  batabank: {
    name: "BataBank AI, USA",
    shortName: "BataBank",
  },
  dpfluiteq: {
    name: "Dpfluiteq",
  },
  enatlas: {
    name: "ENATLAS",
  },
  haslund: {
    name: "Haslund Trading",
  },
  mcalpha: {
    name: "McAlpha Inc",
  },
  nexridge: {
    name: "NexRidge Limited",
    shortName: "NexRidge",
  },
  nuprc: {
    name: "Nigerian Upstream Petroleum Regulatory Commission",
    shortName: "NUPRC",
  },
  "platform-petroleum": {
    name: "Platform Petroleum Limited",
  },
  seapack: {
    name: "Seapack Ventures Ltd.",
    shortName: "Seapack",
  },
  "transition-maritime": {
    name: "Transition Maritime",
  },
  "verte-energies": {
    name: "Verte Energies Ltd",
  },
};

/**
 * Resolves any company name or key to its canonical organisation key.
 */
export function resolveOrganisationKey(nameOrKey?: string): string | undefined {
  if (!nameOrKey) return undefined;
  const directKey = nameOrKey.toLowerCase().trim();
  if (organisations[directKey]) return directKey;
  if (organisationAliases[directKey]) return organisationAliases[directKey];
  const normalized = normalizeOrganisationName(nameOrKey);
  return organisationAliases[normalized] ?? (organisations[normalized] ? normalized : undefined);
}

/**
 * Returns the Organisation record for a given key or name.
 */
export function getOrganisation(keyOrName?: string): Organisation | undefined {
  if (!keyOrName) return undefined;
  const key = resolveOrganisationKey(keyOrName) || keyOrName.toLowerCase().trim();
  return organisations[key];
}

/**
 * Returns the logo URL for a given organisation key or name, or undefined if no logo exists.
 */
export function getOrganisationLogo(keyOrName?: string): string | undefined {
  if (!keyOrName) return undefined;
  const key = resolveOrganisationKey(keyOrName) || keyOrName.toLowerCase().trim();
  return organisations[key]?.logo;
}
