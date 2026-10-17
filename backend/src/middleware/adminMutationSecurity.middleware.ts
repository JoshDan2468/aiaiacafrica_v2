/**
 * Authenticated mutation defense
 *
 * A required custom header prevents cross-site HTML forms from submitting
 * cookie-authenticated writes. Browser origins/referrers are also constrained
 * to the configured frontend allowlist.
 */

import type { RequestHandler } from "express";
import { createPublicError } from "./error.middleware";

export const adminMutationHeaderName = "X-AIAIAC-CSRF";

function originFromReferer(referer: string): string | null {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function createAdminMutationSecurity(
  allowedOrigins: readonly string[],
): RequestHandler {
  return (request, _response, next) => {
    if (request.get(adminMutationHeaderName) !== "1") {
      next(createPublicError(403, "Request security check failed"));
      return;
    }

    const origin = request.get("Origin");
    const referer = request.get("Referer");
    const browserOrigin =
      origin ?? (referer ? originFromReferer(referer) : null);
    if (browserOrigin !== null && !allowedOrigins.includes(browserOrigin)) {
      next(createPublicError(403, "Request security check failed"));
      return;
    }
    next();
  };
}
