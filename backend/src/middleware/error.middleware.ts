import type { ErrorRequestHandler } from "express";
import { env } from "../config/env";

interface PublicError extends Error {
  status?: number;
  publicMessage?: string;
}

export function createPublicError(status: number, publicMessage: string): PublicError {
  return Object.assign(new Error(publicMessage), { status, publicMessage });
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const candidate = error as PublicError;
  const status =
    Number.isInteger(candidate.status) && candidate.status! >= 400 && candidate.status! < 600
      ? candidate.status!
      : 500;
  const malformedJson = error instanceof SyntaxError && status === 400;
  const message = malformedJson
    ? "Invalid JSON request body"
    : candidate.publicMessage || (status >= 500 ? "Internal server error" : "Request failed");

  (response.locals.auditError as ((error: unknown, status: number) => void) | undefined)?.(
    error,
    status,
  );

  if (status >= 500 && env.nodeEnv !== "test") {
    console.error("Unhandled API error", {
      requestId: response.locals.requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
      method: request.method,
      route: request.route ? `${request.baseUrl}${request.route.path}` : "unmatched",
    });
  }

  response.status(status).json({
    success: false,
    message,
    ...(status >= 500 && response.locals.requestId ? { requestId: response.locals.requestId } : {}),
  });
};
