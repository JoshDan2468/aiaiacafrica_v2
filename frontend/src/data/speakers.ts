import type { Speaker } from "@/types";

/**
 * Current 2027 Edition Keynote Speaker
 * Confirmed for the AIAIAC Africa 2027 plenary.
 */
export const currentKeynoteSpeaker: Speaker = {
  id: "dr-james-makinde",
  name: "Dr. James Makinde",
  role: "Managing Director",
  organisation: "ANOH Gas Processing Company Limited",
  organisationKey: "anoh",
  countryCode: "NG",
  countryName: "Nigeria",
  image: "/assets/aiaiac-2027/people/keynote/dr-james-makinde.webp",
  track: "asset-integrity",
  keynote: true,
};

/** Backwards-compatible alias for existing hero references */
export const heroKeynoteSpeaker: Speaker = currentKeynoteSpeaker;

/** Keynote lineup for the 2027 conference */
export const keynotes: Speaker[] = [currentKeynoteSpeaker];

/**
 * 25 Former Conference Edition Speakers (Recovered & Preserved)
 * All portraits are locally verified WebP assets in public/assets/aiaiac-2027/people/speakers/.
 * Kept separate from current-edition executive keynote data.
 */
export const previousEditionSpeakers: Speaker[] = [
  {
    id: "dr-kola-fagbayi",
    name: "Dr. Kola Fagbayi",
    role: "Ex-Vice President",
    organisation: "British Petroleum",
    organisationKey: "bp",
    image: "/assets/aiaiac-2027/people/speakers/dr-kola-fagbayi.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "engr-audu-ibrahim",
    name: "Engr. Audu Ibrahim, FNSE",
    role: "Managing Director",
    organisation: "NNPC Gas Infrastructure Company Limited",
    organisationKey: "nnpc",
    image: "/assets/aiaiac-2027/people/speakers/engr-audu-ibrahim.webp",
    track: "automation-cybersecurity",
    countryCode: "NG",
  },
  {
    id: "rapheal-oluyomi",
    name: "Rapheal Oluyomi",
    role: "Founder & CEO",
    organisation: "Transition Maritime",
    organisationKey: "transition-maritime",
    image: "/assets/aiaiac-2027/people/speakers/rapheal-oluyomi.webp",
    track: "asset-integrity",
  },
  {
    id: "zephaniah-ajibade",
    name: "Zephaniah Ajibade",
    role: "Head, Corrosion Research Centre (CRC)",
    organisation: "Petroleum Training Institute",
    organisationKey: "pti",
    image: "/assets/aiaiac-2027/people/speakers/zephaniah-ajibade.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "david-oni",
    name: "David Oni",
    role: "Head, Subsea Intervention & Construction",
    organisation: "Shell",
    organisationKey: "shell",
    image: "/assets/aiaiac-2027/people/speakers/david-oni.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "chinenye-michelle-orajaka",
    name: "Chinenye Michelle Orajaka",
    role: "Senior Corrosion and Inspection Engineer",
    organisation: "Renaissance Africa Energy Company Limited",
    organisationKey: "renaissance",
    image: "/assets/aiaiac-2027/people/speakers/chinenye-michelle-orajaka.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "olakunle-john-ajayi",
    name: "Olakunle John Ajayi",
    role: "Lead, Integrated Activity Planning",
    organisation: "Renaissance Africa Energy Company",
    organisationKey: "renaissance",
    image: "/assets/aiaiac-2027/people/speakers/olakunle-john-ajayi.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "ayodeji-gabriel-ashidi",
    name: "Ayodeji Gabriel Ashidi",
    role: "Senior Lecturer, Department of Physics",
    organisation: "Federal University of Technology, Akure",
    organisationKey: "futa",
    image: "/assets/aiaiac-2027/people/speakers/ayodeji-gabriel-ashidi.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "razaq-shuaib",
    name: "Razaq Shuaib",
    role: "Asset Operations Support (SMART) Manager",
    organisation: "TotalEnergies",
    organisationKey: "totalenergies",
    image: "/assets/aiaiac-2027/people/speakers/razaq-shuaib.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "albert-ogosi",
    name: "Albert Ogosi",
    role: "Head of Digital Strategy",
    organisation: "Nigeria LNG",
    organisationKey: "nlng",
    image: "/assets/aiaiac-2027/people/speakers/albert-ogosi.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "nelson-nnadozie-emeghara",
    name: "Nelson Nnadozie Emeghara",
    role: "IT Analyst — IT Infrastructure & Operations",
    organisation: "ANOH Gas Processing Company",
    organisationKey: "anoh",
    image: "/assets/aiaiac-2027/people/speakers/nelson-nnadozie-emeghara.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "engr-timothy-oluwadero",
    name: "Engr. Timothy Oluwadero",
    role: "Deputy Chief Officer",
    organisation: "Petroleum Training Institute",
    organisationKey: "pti",
    image: "/assets/aiaiac-2027/people/speakers/engr-timothy-oluwadero.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "omar-el-sheikh",
    name: "Omar El Sheikh",
    role: "Business Development Manager",
    organisation: "Asset Integrity Engineering (AIE)",
    organisationKey: "aie",
    image: "/assets/aiaiac-2027/people/speakers/omar-el-sheikh.webp",
    track: "asset-integrity",
  },
  {
    id: "ajiri-ivovi",
    name: "Ajiri Ivovi",
    role: "Principal Civil Engineer / TA2",
    organisation: "Renaissance Africa Energy Company Limited",
    organisationKey: "renaissance",
    image: "/assets/aiaiac-2027/people/speakers/ajiri-ivovi.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "comfort-moses",
    name: "Comfort Moses",
    role: "Graduate Researcher",
    organisation: "Federal University of Technology, Akure",
    organisationKey: "futa",
    image: "/assets/aiaiac-2027/people/speakers/comfort-moses.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "hossam-aboegla",
    name: "Hossam Aboegla",
    role: "Founder & CEO",
    organisation: "Add Value Consultancy",
    organisationKey: "add-value-consultancy",
    image: "/assets/aiaiac-2027/people/speakers/hossam-aboegla.webp",
    track: "asset-integrity",
  },
  {
    id: "wasiu-salami",
    name: "Wasiu Salami",
    role: "Asset IC&E Engineer, Operations Technical Surface",
    organisation: "Seplat Energy",
    organisationKey: "seplat",
    image: "/assets/aiaiac-2027/people/speakers/wasiu-salami.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "dr-gabriel-farotade",
    name: "Dr. Gabriel Farotade",
    role: "Senior Deputy Manager, Advanced Manufacturing",
    organisation: "Arridex",
    organisationKey: "arridex",
    image: "/assets/aiaiac-2027/people/speakers/dr-gabriel-farotade.webp",
    track: "asset-integrity",
    countryCode: "NG",
  },
  {
    id: "dev-menon",
    name: "Dev Menon",
    role: "Director of Operations",
    organisation: "Dpfluiteq",
    organisationKey: "dpfluiteq",
    image: "/assets/aiaiac-2027/people/speakers/dev-menon.webp",
    track: "asset-integrity",
  },
  {
    id: "djallel-lameche",
    name: "Djallel Lameche",
    role: "Senior Technical Consultant",
    organisation: "Cenosco",
    organisationKey: "cenosco",
    image: "/assets/aiaiac-2027/people/speakers/djallel-lameche.webp",
    track: "asset-integrity",
    countryCode: "NL",
  },
  {
    id: "dr-okikiade-adewale-layioye",
    name: "Dr. Okikiade Adewale Layioye",
    role: "University Lecturer",
    organisation: "The Federal University of Technology, Akure",
    organisationKey: "futa",
    image: "/assets/aiaiac-2027/people/speakers/dr-okikiade-adewale-layioye.webp",
    track: "automation-cybersecurity",
    countryCode: "NG",
  },
  {
    id: "medinatu-musa",
    name: "Medinatu Musa",
    role: "Cybersecurity Specialist",
    organisation: "CSEAN",
    organisationKey: "csean",
    image: "/assets/aiaiac-2027/people/speakers/medinatu-musa.webp",
    track: "automation-cybersecurity",
    countryCode: "NG",
  },
  {
    id: "emmanuel-omoke",
    name: "Emmanuel Omoke",
    role: "Lead Instrumentation & Controls Engineer",
    organisation: "NNPC",
    organisationKey: "nnpc",
    image: "/assets/aiaiac-2027/people/speakers/emmanuel-omoke.webp",
    track: "automation-cybersecurity",
    countryCode: "NG",
  },
  {
    id: "dr-umar-saad",
    name: "Dr. Umar Sa'ad",
    role: "Manager, Information Technology",
    organisation: "ANOH Gas Processing Company",
    organisationKey: "anoh",
    image: "/assets/aiaiac-2027/people/speakers/dr-umar-saad.webp",
    track: "automation-cybersecurity",
    countryCode: "NG",
  },
  {
    id: "osemwinyen-ekhorutomwen",
    name: "Osemwinyen Ekhorutomwen",
    role: "Senior Automation & Cybersecurity Engineer",
    organisation: "Nigeria LNG Limited",
    organisationKey: "nlng",
    image: "/assets/aiaiac-2027/people/speakers/osemwinyen-ekhorutomwen.webp",
    track: "automation-cybersecurity",
    countryCode: "NG",
  },
];

/**
 * Curated Current 2027 Featured Speakers Lineup (12 distinguished industry authorities)
 * Excludes committee and advisory members to avoid duplicate rendering.
 */
export const featuredSpeakers: Speaker[] = previousEditionSpeakers.filter((s) =>
  [
    "engr-audu-ibrahim",
    "rapheal-oluyomi",
    "zephaniah-ajibade",
    "chinenye-michelle-orajaka",
    "olakunle-john-ajayi",
    "ayodeji-gabriel-ashidi",
    "albert-ogosi",
    "nelson-nnadozie-emeghara",
    "engr-timothy-oluwadero",
    "omar-el-sheikh",
    "ajiri-ivovi",
    "comfort-moses",
  ].includes(s.id),
);

/** Backwards-compatible export */
export const speakers: Speaker[] = featuredSpeakers;

/** All speakers (Keynote + Featured) */
export const allSpeakers: Speaker[] = [currentKeynoteSpeaker, ...featuredSpeakers];
