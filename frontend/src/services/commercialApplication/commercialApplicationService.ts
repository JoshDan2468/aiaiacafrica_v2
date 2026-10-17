import { apiRequest } from "@/services/api/client";
import type {
  CommercialApplicationKind,
  CommercialApplicationStatus,
} from "./commercialApplicationTypes";
export type {
  CommercialApplicationKind,
  CommercialApplicationStatus,
} from "./commercialApplicationTypes";

export interface CommercialApplicationConfirmation {
  reference: string;
  applicationType: CommercialApplicationKind;
  selectedPackage: { code: string; name: string };
  currency: "USD";
  priceMinor: number;
  status: CommercialApplicationStatus;
  nextStep: string;
}

export interface CommercialApplicationPayload {
  organizationName: string;
  country: string;
  website?: string | undefined;
  industry?: string | undefined;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  contactJobTitle?: string | undefined;
  notes?: string | undefined;
  consent: true;
}

interface Envelope<T> {
  success: true;
  data: T;
}

function cleanPayload<T extends CommercialApplicationPayload>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined),
  ) as T;
}

async function submit<T extends CommercialApplicationPayload>(path: string, payload: T) {
  const result = await apiRequest<Envelope<CommercialApplicationConfirmation>>(path, {
    method: "POST",
    body: cleanPayload(payload),
  });
  return result.ok && result.data?.data
    ? { ok: true as const, confirmation: result.data.data }
    : { ok: false as const, error: result.error ?? "The application could not be submitted." };
}

export function submitSponsorApplication(
  payload: CommercialApplicationPayload & { sponsorshipTier: string },
) {
  return submit("/sponsor-applications", payload);
}

export function submitExhibitorApplication(
  payload: CommercialApplicationPayload & { exhibitionOption: string },
) {
  return submit("/exhibitor-applications", payload);
}
