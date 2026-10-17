import { apiRequest } from "@/services/api/client";

export type ContactType =
  | "PROFESSIONAL_DELEGATE"
  | "STUDENT_DELEGATE"
  | "SPONSOR"
  | "EXHIBITOR"
  | "ABSTRACT_AUTHOR"
  | "GENERAL_CONTACT"
  | "PROSPECTIVE_DELEGATE"
  | "PROSPECTIVE_SPONSOR"
  | "PROSPECTIVE_EXHIBITOR";

export type ContactSource = "SYSTEM" | "MANUAL" | "IMPORT";

export interface Contact {
  id: string;
  consent?: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  consentEvidence?: string;
  sourceLabel?: string;
  suppressed?: boolean;
  name: string;
  email: string;
  organization: string | null;
  country: string | null;
  status: string;
  createdAt: string;
  source: ContactSource;
  types: ContactType[];
}

export interface ContactPageResult {
  items: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactFilters {
  page: number;
  limit: number;
  search?: string;
  type?: ContactType | "";
  source?: ContactSource | "";
}

export interface NewContact {
  category?:
    "GENERAL_CONTACT" | "PROSPECTIVE_DELEGATE" | "PROSPECTIVE_SPONSOR" | "PROSPECTIVE_EXHIBITOR";
  consent?: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  consentEvidence?: string;
  sourceLabel?: string;
  suppressed?: boolean;
  name: string;
  email: string;
  organization?: string;
  country?: string;
}

export interface ContactImportSummary {
  imported: number;
  skipped: number;
  invalid: number;
  errors: { row: number; reason: string }[];
}

interface Envelope<T> {
  success: true;
  data: T;
}

export class ContactRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ContactRequestError";
  }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await apiRequest<Envelope<T>>(`/admin/communications/contacts${path}`, {
    method,
    body,
  });
  if (!response.ok || !response.data) {
    throw new ContactRequestError(response.error ?? "Contact request failed.", response.status);
  }
  return response.data.data;
}

export const contactService = {
  list: (filters: ContactFilters) => {
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
    });
    if (filters.search) params.set("search", filters.search);
    if (filters.type) params.set("type", filters.type);
    if (filters.source) params.set("source", filters.source);
    return request<ContactPageResult>(`?${params.toString()}`);
  },
  add: (contact: NewContact) => request<Contact>("", "POST", contact),
  importCsv: (csv: string) => request<ContactImportSummary>("/import", "POST", { csv }),
};
