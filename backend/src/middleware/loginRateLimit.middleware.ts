import { rateLimit } from "express-rate-limit";

interface LoginRateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
}

export function createLoginRateLimiter(options: LoginRateLimitOptions) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler(_request, response) {
      response.status(429).json({
        success: false,
        message: "Too many login attempts. Please try again later",
      });
    },
  });
}
