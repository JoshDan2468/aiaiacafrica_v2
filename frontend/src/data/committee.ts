import { conference } from "@/data/conference";
import type { CommitteeMember, TechnicalCommittee } from "@/types";
import { getPersonImage } from "@/utils/personImageResolver";

export const technicalChairman: CommitteeMember = {
  name: "Dr. (Engr.) Gbenga Ayodele Owolabi",
  role: "Commercial Manager",
  organisation: "ANOH Gas Processing Company",
  organisationKey: "anoh",
  country: "Nigeria",
  countryCode: "NG",
  chair: true,
  image: "/assets/aiaiac-2027/people/chairman/dr-engr-gbenga-ayodele-owolabi.webp",
};

export const technicalChairmanHomepageMessage = {
  status: "",
  text: `The Asset Integrity, Artificial Intelligence Automation & Cybersecurity Conference (AIAIAC Africa 2027) will be held from ${conference.dates} in ${conference.venue}, serving as a dedicated platform to address the technical challenges of maintaining safe, reliable, and digitally resilient operations in oil and gas. Bringing together Asset Operators, EPCs, regulators, and technology providers, the conference will highlight the latest innovations driving operational performance, asset integrity, and industrial resilience.`,
} as const;

export const committeeIntro =
  "The Technical Committees of AIAIAC Africa are driven by renowned industry leaders, technical authorities, and innovators. These specialists set the direction for technical excellence, research, and operational frameworks across asset integrity, artificial intelligence, automation, and cybersecurity.";

const rawTechnicalCommittees: TechnicalCommittee[] = [
  {
    id: "asset-integrity",
    name: "Asset Integrity Technical Committee",
    slug: "asset-integrity",
    members: [
      {
        id: "david-oni",
        name: "Engr. David Oni",
        role: "Head, Subsea Intervention & Construction",
        organisation: "Shell Nigeria",
        organisationKey: "shell",
      },
      {
        id: "ikenna-ikonta",
        name: "Engr. Ikenna Ikonta",
        role: "Head Asset Integrity & Plant Optimization",
        organisation: "Nigerian LNG Limited",
        organisationKey: "nlng",
      },
      {
        id: "olalekan-adeaga",
        name: "Engr. Olalekan Adeaga",
        role: "Offshore Installation Manager",
        organisation: "Seplat",
        organisationKey: "seplat",
      },
      {
        id: "olawale-onasoga",
        name: "Engr. Olawale Onasoga",
        role: "Reliability Engineering Manager",
        organisation: "Atlantic LNG",
        organisationKey: "atlantic-lng",
      },
      {
        id: "paul-aminadokiruaru",
        name: "Engr. Paul Aminadokiruaru",
        role: "Erha MIA Superintendent",
        organisation: "ExxonMobil",
        organisationKey: "exxonmobil",
      },
      {
        id: "mavis-sika-okyere",
        name: "Dr. (Engr.) Mavis Sika Okyere",
        role: "Assistant Manager, Pipeline Integrity",
        organisation: "Ghana National Gas Limited Company",
        organisationKey: "ghana-gas",
      },
      {
        id: "eric-oguama",
        name: "Engr. Eric Oguama",
        role: "Manager, Deep Water Assets Inspection",
        organisation: "TotalEnergies Nigeria",
        organisationKey: "totalenergies",
      },
      {
        id: "razaq-shuaib",
        name: "Engr. Razaq Shuaib",
        role: "Asset Operations Support (SMART) Manager",
        organisation: "TotalEnergies Nigeria",
        organisationKey: "totalenergies",
      },
      {
        id: "collins-okaru",
        name: "Engr. Collins Okaru",
        role: "General Manager – Technical",
        organisation: "Verte Energies Ltd",
        organisationKey: "verte-energies",
      },
      {
        id: "henry-osabohien",
        name: "Engr. (Dr.) Henry Osabohien",
        role: "Pipeline Expert",
        organisation: "ADNOC",
        organisationKey: "adnoc",
      },
      {
        id: "tamuonemi-efebeli",
        name: "Dr. Tamuonemi Efebeli",
        role: "Pipelines Operations Manager",
        organisation: "Renaissance Africa",
        organisationKey: "renaissance",
      },
      {
        id: "abduganiyu-teslim",
        name: "Engr. Abduganiyu Teslim",
        role: "Lead, Procurement",
        organisation: "ANOH Gas Processing Company – AGPC",
        organisationKey: "agpc",
      },
      {
        id: "ikedi-uche",
        name: "Engr. Ikedi Uche",
        role: "Principal Materials, Corrosion & Inspection Engineer",
        organisation: "Shell",
        organisationKey: "shell",
      },
      {
        id: "albert-okechukwu-echibe",
        name: "Engr. Albert Okechukwu Echibe",
        role: "Senior Manager, Development and Production Department",
        organisation: "Nigerian Upstream Petroleum Regulatory Commission (NUPRC)",
        organisationKey: "nuprc",
      },
      {
        id: "franklin-okafor",
        name: "Engr. Franklin Okafor",
        role: "Principal Corrosion Engineer",
        organisation: "Shell Nigeria Exploration and Production Company (SNEPCO)",
        organisationKey: "shell",
      },
      {
        id: "olusola-aina",
        name: "Engr. Olusola Aina",
        role: "Manager HSSE/QA",
        organisation: "ANOH Gas",
        organisationKey: "agpc",
      },
      {
        id: "jeremiah-amodu-peter",
        name: "Engr. Jeremiah Amodu Peter",
        role: "Production / Process Engineer",
        organisation: "Dangote Petroleum and Petrochemicals",
        organisationKey: "dangote",
      },
      {
        id: "edgar-njeje",
        name: "Engr. Edgar Njeje",
        role: "Managing Director",
        organisation: "Petroco and Engineering",
        organisationKey: "petroco",
      },
      {
        id: "chukwu-emeke",
        name: "Dr. Chukwu Emeke",
        role: "Base Office Superintendent",
        organisation: "Platform Petroleum Limited",
        organisationKey: "platform-petroleum",
      },
      {
        id: "oluwasegun-lamidi",
        name: "Engr. Oluwasegun Lamidi",
        role: "Facility Engineering Management",
        organisation: "Shell, USA",
        organisationKey: "shell",
      },
      // Withheld from the public committee at the organiser's request.
      // {
      //   id: "allison-gabriel",
      //   name: "Allison Gabriel",
      //   role: "Research and Development Engineer",
      //   organisation: "BG Technical",
      //   organisationKey: "bg-technical",
      // },
    ],
  },
  {
    id: "artificial-intelligence",
    name: "Artificial Intelligence Technical Committee",
    slug: "artificial-intelligence",
    members: [
      {
        id: "olugbenga-abimbola-oredeko",
        name: "Engr. Olugbenga Abimbola Oredeko",
        role: "Founder / CEO / AI Strategist",
        organisation: "BataBank AI, USA",
        organisationKey: "batabank",
        countryCode: "US",
      },
      {
        id: "opubo-edwin-atiegoba",
        name: "Engr. Opubo Edwin Atiegoba",
        role: "Managing Director / Chief Strategy Officer",
        organisation: "Alpha Echo Energy Limited",
        organisationKey: "alpha-echo-energy",
        countryCode: "NG",
      },
      {
        id: "onasoga-olukayode-a",
        name: "Dr. Engr. Onasoga Olukayode A",
        role: "Research Associate and AI Specialist",
        organisation: "University Utara Malaysia (UUM)",
        organisationKey: "uum",
        countryCode: "MY",
      },
      {
        id: "taiwo-lawal",
        name: "Engr. Taiwo Lawal",
        role: "Founder & CEO",
        organisation: "HAMWALTECH SOLUTIONS",
        organisationKey: "hamwaltech",
        countryCode: "NG",
      },
      {
        id: "oluwatomisin-asere",
        name: "Oluwatomisin Asere",
        role: "Managing Director / Lead Consultant",
        organisation: "Moduslights Technologies",
        organisationKey: "moduslights",
        countryCode: "NG",
      },
      {
        id: "effiong-okwong",
        name: "Effiong Okwong",
        role: "VP, Digital Solutions",
        organisation: "Arridex",
        organisationKey: "arridex",
        countryCode: "NG",
      },
    ],
  },
  {
    id: "automation-cybersecurity",
    name: "Automation & Cybersecurity Technical Committee",
    slug: "automation-cybersecurity",
    members: [
      {
        id: "joseph-s-ojo",
        name: "Prof. Joseph S. Ojo",
        role: "Director, Center for Space Research and Applications",
        organisation: "CESRA",
        organisationKey: "cesra",
      },
      {
        id: "umar-saad",
        name: "Dr. Umar Sa’ad",
        role: "Manager, Information Technology",
        organisation: "AGPC",
        organisationKey: "agpc",
      },
      {
        id: "emmanuel-omoke",
        name: "Emmanuel Omoke",
        role: "Regulatory Compliance & Business Ethics",
        organisation: "Nigeria Gas Infrastructure Company",
        organisationKey: "nnpc",
      },
      {
        id: "ahmed-barrak",
        name: "Ahmed Barrak",
        role: "CTO / Cybersecurity Leader",
        organisation: "Aramco",
        organisationKey: "aramco",
      },
      {
        id: "ademola-agboola",
        name: "Dr. Ademola Agboola",
        role: "Group Head, Information Technology",
        organisation: "Pan Ocean and Newcross Companies",
        organisationKey: "pan-ocean",
      },
      {
        id: "desmond-inyamah",
        name: "Engr. Desmond Inyamah",
        role: "Manager, Refinery Audit",
        organisation: "NNPC",
        organisationKey: "nnpc",
      },
      {
        id: "olabode-agboola",
        name: "Olabode Agboola",
        role: "President",
        organisation: "Cybersecurity Experts Association of Nigeria (CSEAN)",
        organisationKey: "csean",
      },
      {
        id: "marshal-abraham",
        name: "Engr. Marshal Abraham",
        role: "Instrumentation, Control & Automation Engineer",
        organisation: "ASB Valiant Company Limited",
        organisationKey: "asb-valiant",
      },
      {
        id: "tolulope-longe",
        name: "Tolulope Longe",
        role: "Manager, Commercial Contract Management",
        organisation: "NLNG",
        organisationKey: "nlng",
      },
      {
        id: "cynthia-kevin-nwahiri",
        name: "Cynthia Kevin-Nwahiri",
        role: "Senior IT Governance / IT Budget & Cost Control / Cyber Security Personnel",
        organisation: "Tranter IT Infrastructure",
        organisationKey: "tranter-it",
      },
      {
        id: "boniface-kayode-alese",
        name: "Prof. Boniface Kayode Alese",
        role: "Professor, Department of Cybersecurity",
        organisation: "The Federal University of Technology, Akure",
        organisationKey: "futa",
      },
      {
        id: "mohammed-al-abbadi",
        name: "Mohammed Al Ab badi",
        role: "Group CIO",
        organisation: "Fertiglobe",
        organisationKey: "fertiglobe",
      },
      {
        id: "belarmino-van-dunem",
        name: "Belarmino Van Dunem",
        role: "Automation Expert",
        organisation: "Sonangol",
        organisationKey: "sonangol",
      },
      {
        id: "oladapo-ojo",
        name: "Engr. Oladapo Ojo",
        role: "Managing Director",
        organisation: "Daptem Engineering",
        organisationKey: "daptem",
      },
      {
        id: "emmanuel-eno",
        name: "Engr. Emmanuel Eno",
        role: "HVDC SCADA & Control Systems Engineer / ICSS Specialist / Researcher / IA Trainer",
        organisation: "Hitachi Energy",
        organisationKey: "hitachi",
      },
      {
        id: "awe-afolabi-thomas",
        name: "Engr. Awe Afolabi Thomas",
        role: "Principal Process, Automation, Control and Optimization (PACO) Engineer – Technical Authority Level 2",
        organisation: "Renaissance Africa Energy Company",
        organisationKey: "renaissance",
      },
      {
        id: "wasiu-abiola-salami",
        name: "Engr. Wasiu Abiola Salami",
        role: "Senior Program Engineer",
        organisation: "Seplat",
        organisationKey: "seplat",
      },
    ],
  },
];

export const technicalCommittees: TechnicalCommittee[] = rawTechnicalCommittees.map((tc) => ({
  ...tc,
  members: tc.members.map((m) => ({
    ...m,
    image: getPersonImage({
      section: tc.slug,
      personName: m.name,
      personSlug: m.id,
    }),
  })),
}));

// Flat export of all members for convenience if needed elsewhere
export const allCommitteeMembers = technicalCommittees.flatMap((c) => c.members);

// Legacy export compatibility if referenced in existing components
export const committee: CommitteeMember[] = allCommitteeMembers.map((m) => ({
  name: m.name,
  role: m.role,
  organisation: m.organisation,
  organisationKey: m.organisationKey,
  image: m.image,
}));
