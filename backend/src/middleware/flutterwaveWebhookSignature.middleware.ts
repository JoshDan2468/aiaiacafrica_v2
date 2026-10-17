import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { createPublicError } from "./error.middleware";

/** Standard API v3 uses verif-hash (shared secret), not the v4 HMAC protocol. */
export function createFlutterwaveWebhookSignatureMiddleware(
  secretHash?: string,
): RequestHandler {
  return (request, _response, next) => {
    if (!secretHash)
      return next(createPublicError(503, "Payment provider is unavailable"));
    const supplied = Buffer.from(request.header("verif-hash") ?? "");
    const expected = Buffer.from(secretHash);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return next(createPublicError(401, "Invalid payment webhook signature"));
    }
    next();
  };
}
