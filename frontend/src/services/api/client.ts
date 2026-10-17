/**
 * Shared browser-to-server boundary.
 * `apiRequest` performs real requests, while `apiPost` remains
 * a temporary registration mock as long as `USE_MOCK` is true.
 */
const configuredApiUrl = import.meta.env["VITE_API_URL"]?.trim().replace(/\/+$/, "") ?? "";

export const API_BASE_URL = `${configuredApiUrl}/api`;
export const USE_MOCK = true;
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

function getRequestError(status: number): string {
  if (status === 400)
    return "The request could not be completed. Check your details and try again.";
  if (status === 401) return "Authentication is required.";
  if (status === 403) return "You do not have permission to access this area.";
  if (status === 409) return "This request conflicts with the current account state.";
  if (status === 410) return "This invitation has expired.";
  if (status === 429) return "Too many attempts. Please wait and try again.";
  if (status === 502) return "An upstream service request failed. Please try again.";
  return "The service is temporarily unavailable. Please try again.";
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { body, headers, ...requestOptions } = options;

  try {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");
    if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
    const method = (requestOptions.method ?? "GET").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      // Preserve the non-simple mutation header used by the API boundary.
      requestHeaders.set("X-AIAIAC-CSRF", "1");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      credentials: requestOptions.credentials ?? "include",
      headers: requestHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let data: T | undefined;

    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      return { ok: false, status: response.status, error: getRequestError(response.status) };
    }

    return data === undefined
      ? { ok: true, status: response.status }
      : { ok: true, status: response.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "We could not reach the service. Check your connection and try again.",
    };
  }
}

export async function apiPost<TBody, TData>(path: string, body: TBody): Promise<ApiResult<TData>> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, data: { received: true, path, body } as unknown as TData };
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: getRequestError(res.status) };
    return { ok: true, data: (await res.json()) as TData };
  } catch {
    return { ok: false, error: "We could not reach the service. Please try again." };
  }
}
