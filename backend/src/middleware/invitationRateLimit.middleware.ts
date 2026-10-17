/** Focused limits for public token lookup and password-creation attempts. */

import { rateLimit } from "express-rate-limit";

export function createInvitationRateLimiter(options: {
  readonly windowMs: number;
  readonly max: number;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler(_request, response) {
      response.status(429).json({
        success: false,
        message: "Too many invitation attempts. Please wait and try again.",
      });
    },
  });
}
