import { getPersonImage } from "@/utils/personImageResolver";

export interface OrganisingCommitteeMember {
  id: string;
  name: string;
  role: string;
  organisation: string;
  organisationKey?: string | undefined;
  image?: string | undefined;
  countryCode?: string | undefined;
  organisationLogo?: string | undefined;
}

const rawOrganisingCommitteeMembers: OrganisingCommitteeMember[] = [
  {
    id: "bunmi-daramola",
    name: "Bunmi Daramola",
    role: "Managing Director / CEO and Coordinator, AIAIAC Organising Committee",
    organisation: "GExperts Energy Limited",
    organisationKey: "gexperts",
    countryCode: "NG",
  },
  {
    id: "omowunmi-oladele",
    name: "Omowunmi Oladele",
    role: "Multi-Award Winning AI Product Manager",
    organisation: "Avetium Holdco",
    organisationKey: "avetium",
  },
  {
    id: "brumilda-haslund",
    name: "Brumilda Haslund",
    role: "SME Trader, Event Planner, Accountant / Consultant, Managing Director",
    organisation: "Haslund Trading",
    organisationKey: "haslund",
  },
  {
    id: "joseph-fatoye",
    name: "Joseph Fatoye",
    role: "Junior Technical Officer — Robotics, AI & Automation",
    organisation: "GExperts Energy Limited",
    organisationKey: "gexperts",
  },
  {
    id: "nonye-nketa",
    name: "Nonye Nketa",
    role: "Technical Sales — Belzona",
    organisation: "Navante Oil & Gas Company Limited",
    organisationKey: "navante",
  },
  {
    id: "ezeji-stephanie",
    name: "Ezeji Stephanie",
    role: "Business Development Executive",
    organisation: "GExperts Energy Limited",
    organisationKey: "gexperts",
  },
  {
    id: "victory-adabhie",
    name: "Victory Adabhie",
    role: "Business Development Executive",
    organisation: "GExperts Energy Limited",
    organisationKey: "gexperts",
  },
  {
    id: "wilbert-adri",
    name: "Wilbert Adri",
    role: "Technical Sales Engineer",
    organisation: "Seapack Ventures Ltd.",
    organisationKey: "seapack",
    countryCode: "GH",
  },
  {
    id: "emmanuel-samson",
    name: "Emmanuel Samson",
    role: "Founder",
    organisation: "Co-Founder of ENATLAS",
    organisationKey: "enatlas",
    countryCode: "GH",
  },
  {
    id: "adedoyin-yusuf",
    name: "Adedoyin Yusuf",
    role: "Strategic Development and Partnerships",
    organisation: "Arridex",
    organisationKey: "arridex",
  },
  {
    id: "maria-henshaw",
    name: "Maria Henshaw",
    role: "Business Development Executive",
    organisation: "NexRidge Limited",
    organisationKey: "nexridge",
  },
  {
    id: "quadri-basit-omoniyi",
    name: "Quadri Basit Omoniyi",
    role: "Junior Technical officer",
    organisation: "Gexperts Energy Limited",
    organisationKey: "gexperts",
    countryCode: "NG",
  },
];

export const organisingCommitteeMembers: OrganisingCommitteeMember[] =
  rawOrganisingCommitteeMembers.map((m) => ({
    ...m,
    image: getPersonImage({
      section: "organising-committee",
      personName: m.name,
      personSlug: m.id,
    }),
  }));
