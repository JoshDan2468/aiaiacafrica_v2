export type Track = string;

export interface Speaker {
  id: string;
  name: string;
  role: string;
  organisation: string;
  organisationKey?: string | undefined;
  image?: string | undefined;
  track: Track;
  keynote?: boolean | undefined;
  countryCode?: string | undefined;
  countryName?: string | undefined;
  organisationLogo?: string | undefined;
}

export interface CommitteeMember {
  name: string;
  role: string;
  organisation: string;
  organisationKey?: string | undefined;
  country?: string | undefined;
  countryCode?: string | undefined;
  flag?: string | undefined;
  chair?: boolean | undefined;
  image?: string | undefined;
}

export interface TechnicalCommitteeMember {
  showOrganisationLogo?: boolean | undefined;
  id: string;
  name: string;
  role: string;
  organisation: string;
  organisationKey?: string | undefined;
  image?: string | undefined;
  organisationLogo?: string | undefined;
  countryCode?: string | undefined;
}

export interface TechnicalCommittee {
  id: string;
  name: string;
  slug: string;
  members: TechnicalCommitteeMember[];
}

export interface Sponsor {
  id: string;
  logo: string;
  tier: SponsorTier["id"];
  name?: string;
}

export interface SponsorTier {
  id: "associate" | "knowledge" | "exhibitor" | "supporting" | "media";
  label: string;
  archivePath: `/sponsorship/${string}`;
}

export interface ProgrammeSession {
  time: string;
  title: string;
  detail?: string;
  hall?: string;
  placeholder?: boolean;
}

export interface ProgrammeDay {
  id: string;
  date: string;
  label: string;
  summary: string;
  sessions: ProgrammeSession[];
}

export interface MediaItem {
  id: string;
  src: string;
  caption: string;
  width: number;
  height: number;
}

export interface Pillar {
  index: string;
  title: string;
  description: string;
  image: string;
}

export interface RegistrationOption {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  cta: string;
  intent: "delegate" | "exhibitor" | "sponsor";
  route: `/registration/${"delegate" | "exhibitor" | "sponsor"}`;
}
