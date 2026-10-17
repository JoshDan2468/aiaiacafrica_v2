import { rateLimit } from "express-rate-limit";

export function createPaymentRateLimiter(options: {
  windowMs: number;
  max: number;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler(_request, response) {
      response.status(429).json({
        success: false,
        message: "Too many payment requests. Please wait and try again later.",
      });
    },
  });
}
