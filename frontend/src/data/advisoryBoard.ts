import { getPersonImage } from "@/utils/personImageResolver";

export interface AdvisoryBoardMember {
  showOrganisationLogo?: boolean | undefined;
  id: string;
  name: string;
  role: string;
  organisation: string;
  organisationKey?: string | undefined;
  image?: string | undefined;
  countryCode?: string | undefined;
  organisationLogo?: string | undefined;
}

const rawAdvisoryBoardMembers: AdvisoryBoardMember[] = [
  {
    id: "isaac-adekanye",
    name: "Dr. Engr. Isaac Adekanye",
    role: "Ex-Chair IEEE and Ex Production Manager, AGIP Nigeria",
    organisation: "AGIP Nigeria",
    organisationKey: "agip",
  },
  {
    id: "olalekan-oyeleye",
    name: "Engr. Olalekan Oyeleye",
    role: "Managing Director / CEO",
    organisation: "Candid Oil",
    organisationKey: "candid-oil",
  },
  {
    id: "sooravan-tharmalingam",
    name: "Engr. Sooravan Tharmalingam",
    role: "Chief Inspection Consultant",
    organisation: "ExxonMobil Nigeria",
    organisationKey: "exxonmobil",
  },
  {
    id: "ester-christopher",
    name: "Engr. Ester Christopher",
    role: "Managing Director",
    organisation: "MERITECH LTD",
    organisationKey: "meritech",
    countryCode: "TZ",
  },
  {
    id: "omar-rugebani",
    name: "Omar Rugebani",
    role: "Partner and Alliance Director",
    organisation: "Cenosco Netherlands",
    organisationKey: "cenosco",
  },
  {
    id: "nnanna-ukaegbu",
    name: "Engr. Nnanna Charles Ukaegbu",
    role: "MD / Chief Executive Officer",
    organisation: "Orashi Petroleum Development Company Limited",
    organisationKey: "orashi",
  },
  {
    id: "tina-isichei",
    name: "Dr. Mrs. Tina Isichei",
    role: "Director, Research & Development",
    organisation: "Petroleum Training Institute",
    organisationKey: "pti",
  },
  {
    id: "abel-nwobodo",
    name: "Engr. Abel Onyemaechi Nwobodo",
    role: "Founder / Managing Director",
    organisation: "Phenomenal Energy Limited",
    organisationKey: "phenomenal-energy",
  },
  {
    id: "ayo-giwa",
    name: "Engr. Ayo Giwa",
    role: "President and CEO",
    organisation: "McAlpha Inc",
    organisationKey: "mcalpha",
    countryCode: "CA",
  },
  {
    id: "raj-mohandoss",
    name: "Raj Mohandoss",
    role: "Technical Manager",
    organisation: "Jotun Nigeria",
    organisationKey: "jotun",
  },
  {
    id: "kayode-adeleke",
    name: "Kayode Adeleke",
    role: "Group Chief Executive Officer",
    organisation: "Arridex",
    organisationKey: "arridex",
  },
  {
    id: "kola-fagbayi",
    showOrganisationLogo: false,
    name: "Dr. Kola Fagbayi",
    role: "Ex VP, Business Assurance",
    organisation: "BP Petroleum",
    organisationKey: "bp",
    countryCode: "US",
  },
];

export const advisoryBoardMembers: AdvisoryBoardMember[] = rawAdvisoryBoardMembers.map((m) => ({
  ...m,
  image: getPersonImage({
    section: "advisory-board",
    personName: m.name,
    personSlug: m.id,
  }),
}));
