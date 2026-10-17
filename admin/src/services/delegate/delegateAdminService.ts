import { apiRequest } from "@/services/api/client";
import type { DelegateType, PaymentStatus, RegistrationStatus } from "./delegateTypes";
export type { DelegatePackage, PaymentStatus, RegistrationStatus } from "./delegateTypes";

export interface DelegateListItem {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  packageName: string;
  country: string;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  emailVerificationStatus: "UNVERIFIED" | "VERIFIED";
  submittedAt: string;
}

export interface DelegateRegistrationDetail extends DelegateListItem {
  email: string;
  mobile: string;
  telephone: string | null;
  jobTitle: string;
  primaryActivity: string;
  mainObjective: string;
  heardAboutSource: string;
  privacyConsent: boolean;
  dataSharingConsent: boolean;
  packageId: string;
  packageType: DelegateType;
  packageDescription: string;
  packageBenefits: string[];
  currency: string | null;
  priceMinor: number | null;
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt: string | null;
  authoritativePayment: {
    paymentReference: string;
    source: "PAYSTACK" | "MANUAL";
    method: "PAYSTACK" | "BANK_TRANSFER" | "OFFLINE";
    confirmedAt: string | null;
  } | null;
}

export interface DelegateListFilters {
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  packageId?: string | undefined;
  registrationStatus?: RegistrationStatus | undefined;
  paymentStatus?: PaymentStatus | undefined;
  country?: string | undefined;
  submittedFrom?: string | undefined;
  submittedTo?: string | undefined;
  sort?: "submitted_desc" | "submitted_asc" | "name_asc" | "name_desc" | undefined;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

function toQuery(filters: DelegateListFilters): string {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function getAdminDelegates(filters: DelegateListFilters) {
  const result = await apiRequest<
    ApiEnvelope<{
      registrations: { items: DelegateListItem[]; total: number; page: number; limit: number };
    }>
  >(`/admin/delegates${toQuery(filters)}`);
  return result.ok && result.data
    ? { ok: true as const, registrations: result.data.data.registrations }
    : { ok: false as const, status: result.status, error: result.error };
}

export async function getAdminDelegate(id: string) {
  const result = await apiRequest<ApiEnvelope<{ registration: DelegateRegistrationDetail }>>(
    `/admin/delegates/${id}`,
  );
  return result.ok && result.data
    ? { ok: true as const, registration: result.data.data.registration }
    : { ok: false as const, status: result.status, error: result.error };
}
