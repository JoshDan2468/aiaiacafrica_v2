export const contactTypes = [
  "PROSPECTIVE_DELEGATE",
  "PROSPECTIVE_SPONSOR",
  "PROSPECTIVE_EXHIBITOR",
  "PROFESSIONAL_DELEGATE",
  "STUDENT_DELEGATE",
  "SPONSOR",
  "EXHIBITOR",
  "ABSTRACT_AUTHOR",
  "GENERAL_CONTACT",
] as const;

export type ContactType = (typeof contactTypes)[number];
export type ContactSource = "SYSTEM" | "MANUAL" | "IMPORT";

export interface ContactRecord {
  id: string;
  consent?: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT" | undefined;
  consentEvidence?: string | undefined;
  sourceLabel?: string | null | undefined;
  suppressed?: boolean;
  name: string;
  email: string;
  organization: string | null;
  country: string | null;
  status: string;
  createdAt: Date;
  source: ContactSource;
  types: ContactType[];
}

export interface ContactFilters {
  page: number;
  limit: number;
  search?: string | undefined;
  type?: ContactType | undefined;
  source?: ContactSource | undefined;
}

export interface ManualContactInput {
  category?:
    | "GENERAL_CONTACT"
    | "PROSPECTIVE_DELEGATE"
    | "PROSPECTIVE_SPONSOR"
    | "PROSPECTIVE_EXHIBITOR"
    | undefined;
  consent?: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT" | undefined;
  consentEvidence?: string | undefined;
  sourceLabel?: string | null | undefined;
  suppressed?: boolean;
  name: string;
  email: string;
  organization?: string | undefined;
  country?: string | undefined;
}

export interface ContactImportError {
  row: number;
  reason: string;
}

export interface ContactImportSummary {
  imported: number;
  skipped: number;
  invalid: number;
  errors: ContactImportError[];
}
