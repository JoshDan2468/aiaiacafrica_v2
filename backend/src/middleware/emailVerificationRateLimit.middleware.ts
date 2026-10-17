import { rateLimit } from "express-rate-limit";

export function createEmailVerificationRateLimiter(options: {
  readonly windowMs: number;
  readonly max: number;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many email verification attempts. Please wait and try again.",
    },
  });
}
