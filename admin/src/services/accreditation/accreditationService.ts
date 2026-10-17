import { apiRequest } from "@/services/api/client";
import type {
  Accreditation,
  AccreditationCategory,
  AccreditationEvent,
  AccreditationStatus,
  CreateAccreditationInput,
} from "@/types/accreditation";

interface Envelope<T> {
  success: boolean;
  data: T;
}

function failure(error: string | undefined, fallback: string) {
  return { ok: false as const, error: error ?? fallback };
}

export async function listAccreditationEvents() {
  const result = await apiRequest<Envelope<{ events: AccreditationEvent[] }>>(
    "/admin/accreditations/events",
  );
  return result.ok && result.data?.data.events
    ? { ok: true as const, events: result.data.data.events }
    : failure(result.error, "Events could not be loaded.");
}

export async function listAccreditations(filters: {
  eventId: string;
  category?: AccreditationCategory;
  status?: AccreditationStatus;
  page?: number;
}) {
  const query = new URLSearchParams({ eventId: filters.eventId });
  if (filters.category) query.set("category", filters.category);
  if (filters.status) query.set("status", filters.status);
  query.set("page", String(filters.page ?? 1));
  const result = await apiRequest<
    Envelope<{ accreditations: Accreditation[]; page: number; hasMore: boolean }>
  >(`/admin/accreditations?${query.toString()}`);
  const data = result.data?.data;
  return result.ok &&
    Array.isArray(data?.accreditations) &&
    typeof data.page === "number" &&
    typeof data.hasMore === "boolean"
    ? {
        ok: true as const,
        accreditations: data.accreditations,
        page: data.page,
        hasMore: data.hasMore,
      }
    : failure(result.error, "Accreditations could not be loaded.");
}

export async function getAccreditation(id: string) {
  const result = await apiRequest<Envelope<{ accreditation: Accreditation }>>(
    `/admin/accreditations/${encodeURIComponent(id)}`,
  );
  return result.ok && result.data?.data.accreditation
    ? { ok: true as const, accreditation: result.data.data.accreditation }
    : failure(result.error, "Accreditation could not be loaded.");
}

export async function createAccreditation(input: CreateAccreditationInput) {
  const result = await apiRequest<Envelope<{ accreditation: Accreditation }>>(
    "/admin/accreditations",
    { method: "POST", body: input },
  );
  return result.ok && result.data?.data.accreditation
    ? { ok: true as const, accreditation: result.data.data.accreditation }
    : failure(result.error, "Accreditation could not be created.");
}

export async function updateAccreditationStatus(id: string, status: "APPROVED" | "REVOKED") {
  const result = await apiRequest<Envelope<{ accreditation: Accreditation }>>(
    `/admin/accreditations/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: { status } },
  );
  return result.ok && result.data?.data.accreditation
    ? { ok: true as const, accreditation: result.data.data.accreditation }
    : failure(result.error, "Accreditation status could not be updated.");
}
