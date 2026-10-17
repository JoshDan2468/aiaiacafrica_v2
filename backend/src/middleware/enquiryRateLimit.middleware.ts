import { rateLimit } from "express-rate-limit";

export function createEnquiryRateLimiter(options: {
  readonly windowMs: number;
  readonly max: number;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler(_request, response) {
      response
        .status(429)
        .json({
          success: false,
          message:
            "Too many enquiry attempts. Please wait and try again later.",
        });
    },
  });
}
