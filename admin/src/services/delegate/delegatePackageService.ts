import { apiRequest } from "@/services/api/client";
import type { DelegatePackage } from "./delegateTypes";

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export async function getDelegatePackages() {
  const result =
    await apiRequest<ApiEnvelope<{ packages: DelegatePackage[] }>>("/delegate-packages");
  return result.ok && result.data
    ? { ok: true as const, packages: result.data.data.packages }
    : { ok: false as const, status: result.status, error: result.error };
}
