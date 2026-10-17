import { rateLimit } from "express-rate-limit";

export function createStudentEvidenceUploadRateLimiter(options: {
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
      message: "Too many evidence upload attempts. Please wait and try again.",
    },
  });
}
