import { apiRequest } from "@/services/api/client";
import type { EnquiryCategory, EnquiryStatus } from "./enquiryTypes";
export { enquiryCategories } from "./enquiryTypes";
export type { EnquiryStatus } from "./enquiryTypes";

export interface EnquiryListItem {
  reference: string;
  sender: string;
  email: string;
  category: EnquiryCategory;
  subject: string;
  status: EnquiryStatus;
  submittedAt: string;
}

export interface EnquiryHistoryItem {
  id: string;
  action: string;
  fromStatus: EnquiryStatus | null;
  toStatus: EnquiryStatus;
  adminName: string | null;
  internalNote: string | null;
  createdAt: string;
}

export interface EnquiryDetail extends EnquiryListItem {
  firstName: string;
  lastName: string;
  phone: string | null;
  organization: string | null;
  country: string | null;
  message: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  history: EnquiryHistoryItem[];
}

interface Envelope<T> {
  success: true;
  data: T;
}

export async function listEnquiries(query: URLSearchParams) {
  const result = await apiRequest<
    Envelope<{
      enquiries: {
        items: EnquiryListItem[];
        page: number;
        total: number;
        totalPages: number;
      };
    }>
  >(`/admin/enquiries?${query}`);
  return result.ok && result.data?.success && result.data.data?.enquiries
    ? { ok: true as const, enquiries: result.data.data.enquiries }
    : { ok: false as const, error: result.error ?? "The enquiry queue was unavailable." };
}

export async function getEnquiry(reference: string) {
  const result = await apiRequest<Envelope<{ enquiry: EnquiryDetail }>>(
    `/admin/enquiries/${encodeURIComponent(reference)}`,
  );
  return result.ok && result.data?.success && result.data.data?.enquiry
    ? { ok: true as const, enquiry: result.data.data.enquiry }
    : { ok: false as const, error: result.error ?? "The enquiry was unavailable." };
}

export async function changeEnquiryStatus(
  reference: string,
  action: "in-progress" | "resolve" | "close",
  note: string,
) {
  const result = await apiRequest<Envelope<{ enquiry: EnquiryDetail }>>(
    `/admin/enquiries/${encodeURIComponent(reference)}/${action}`,
    { method: "POST", body: note ? { note } : {} },
  );
  return result.ok && result.data?.success
    ? { ok: true as const }
    : { ok: false as const, error: result.error ?? "The enquiry could not be updated." };
}

export async function retryEnquiryNotifications(reference: string) {
  const result = await apiRequest<Envelope<{ attempted: number }>>(
    `/admin/enquiries/${encodeURIComponent(reference)}/notifications/retry`,
    { method: "POST", body: {} },
  );
  return result.ok && result.data?.success
    ? { ok: true as const, attempted: result.data.data.attempted }
    : { ok: false as const, error: result.error ?? "The notification retry failed." };
}
