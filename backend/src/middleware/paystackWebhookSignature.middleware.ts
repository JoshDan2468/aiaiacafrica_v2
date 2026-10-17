import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { createPublicError } from "./error.middleware";

export function createPaystackWebhookSignatureMiddleware(
  secretKey: string | undefined,
): RequestHandler {
  return (request, _response, next) => {
    if (!secretKey) {
      next(createPublicError(503, "Payment provider is unavailable"));
      return;
    }
    const signature = request.header("x-paystack-signature");
    if (!request.rawBody || !signature || !/^[a-f0-9]{128}$/i.test(signature)) {
      next(createPublicError(401, "Invalid payment webhook signature"));
      return;
    }
    const expected = Buffer.from(
      createHmac("sha512", secretKey).update(request.rawBody).digest("hex"),
      "hex",
    );
    const supplied = Buffer.from(signature, "hex");
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      next(createPublicError(401, "Invalid payment webhook signature"));
      return;
    }
    next();
  };
}
