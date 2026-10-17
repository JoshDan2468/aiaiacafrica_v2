import { apiRequest } from "@/services/api/client";
import type { EnquiryCategory } from "./enquiryTypes";
export { enquiryCategories } from "./enquiryTypes";
export type { EnquiryCategory, EnquiryStatus } from "./enquiryTypes";

export interface EnquirySubmission {
  idempotencyKey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organization?: string;
  country?: string;
  category: EnquiryCategory;
  subject: string;
  message: string;
}

interface Envelope<T> {
  success: true;
  data: T;
}

export function createEnquiryIdempotencyKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export async function submitEnquiry(input: EnquirySubmission) {
  const result = await apiRequest<Envelope<{ reference: string; acknowledgement: string }>>(
    "/enquiries",
    { method: "POST", body: input },
  );
  return result.ok && result.data?.success && result.data.data?.reference
    ? { ok: true as const, ...result.data.data }
    : { ok: false as const, error: result.error ?? "The enquiry response was invalid." };
}
