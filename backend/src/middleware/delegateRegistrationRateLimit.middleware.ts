import { rateLimit } from "express-rate-limit";

interface DelegateRegistrationRateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
}

export function createDelegateRegistrationRateLimiter(
  options: DelegateRegistrationRateLimitOptions,
) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler(_request, response) {
      response.status(429).json({
        success: false,
        message:
          "Too many registration attempts. Please wait and try again later.",
      });
    },
  });
}
