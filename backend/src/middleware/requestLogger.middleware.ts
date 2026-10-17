import { createHmac, randomBytes } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { env } from "../config/env";
import { AuditFile } from "../observability/auditFile";
import { auditIdentity } from "../observability/auditIdentity";
import { runWithAuditReporter } from "../observability/operationContext";

type AuditSink = Pick<AuditFile, "write">;
type SafeFields = Record<string, string | number | boolean>;

const paymentStatuses = new Set([
  "INITIALIZED",
  "PENDING",
  "PENDING_CONFIRMATION",
  "PAID",
  "FAILED",
  "ABANDONED",
  "REVERSED",
  "DUPLICATE_SUCCESS",
  "RECONCILIATION_REQUIRED",
]);
const currencies = new Set(["USD", "NGN"]);
const methods = new Set(["PAYSTACK", "BANK_TRANSFER", "OFFLINE"]);

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function allowed(values: Set<string>, value: unknown): value is string {
  return typeof value === "string" && values.has(value);
}

export function createRequestLogger(options: {
  sink: AuditSink;
  pseudonymKey: string | Buffer;
}): RequestHandler {
  const fingerprint = (kind: "registration" | "payment" | "email", value: unknown) =>
    auditIdentity(kind, value, options.pseudonymKey);
  const submit = (entry: Record<string, unknown>) => {
    void options.sink.write({ timestamp: new Date().toISOString(), ...entry }).catch(() => {
      // A logging fault must not alter payment or registration behavior.
      console.error("Audit file write failed");
    });
  };

  const context = (request: Request): SafeFields => {
    const body = record(request.body);
    const data = record(body.data);
    const params = record(request.params);
    const result: SafeFields = {};
    const registration = fingerprint(
      "registration",
      body.registrationReference ?? params.reference,
    );
    const payment = fingerprint(
      "payment",
      data.reference ?? data.transaction_reference ?? params.reference,
    );
    const email = fingerprint("email", body.email ?? record(data.customer).email);
    if (registration) result.registrationId = registration;
    if (payment) result.paymentId = payment;
    if (email) result.personId = email;
    if (allowed(currencies, body.currency)) result.currency = body.currency;
    if (allowed(methods, body.method)) result.paymentMethod = body.method;
    return result;
  };

  const paymentSummary = (body: unknown): SafeFields => {
    const data = record(record(body).data);
    const payment = record(data.payment);
    const result: SafeFields = {};
    const registration = fingerprint("registration", payment.registrationReference);
    const paymentId = fingerprint("payment", payment.paymentReference);
    if (registration) result.registrationId = registration;
    if (paymentId) result.paymentId = paymentId;
    if (allowed(paymentStatuses, payment.status)) result.paymentStatus = payment.status;
    if (allowed(currencies, payment.currency)) result.currency = payment.currency;
    if (allowed(methods, payment.paymentMethod)) result.paymentMethod = payment.paymentMethod;
    if (Number.isSafeInteger(payment.amountMinor) && (payment.amountMinor as number) >= 0) {
      result.amountMinor = payment.amountMinor as number;
    }
    if (typeof data.alreadyConfirmed === "boolean") result.alreadyConfirmed = data.alreadyConfirmed;
    if (typeof data.processed === "boolean") result.webhookProcessed = data.processed;
    if (allowed(paymentStatuses, data.status)) result.paymentStatus = data.status;
    return result;
  };

  return (request, response, next) => {
    const correlationId = response.locals.requestId as string;
    const startedAt = performance.now();
    let responseFields: SafeFields = {};
    let finished = false;
    submit({ event: "request", correlationId, method: request.method });

    const originalJson = response.json.bind(response);
    response.json = ((body: unknown) => {
      if (request.originalUrl.toLowerCase().includes("payment")) {
        responseFields = paymentSummary(body);
      }
      return originalJson(body);
    }) as typeof response.json;

    response.locals.auditError = (error: unknown, status: number) => {
      const candidate = error instanceof Error ? error : undefined;
      const errorType =
        candidate?.name && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(candidate.name)
          ? candidate.name
          : "UnknownError";
      const errorId = candidate
        ? createHmac("sha256", options.pseudonymKey)
            .update(`${candidate.name}:${candidate.stack ?? candidate.message}`)
            .digest("hex")
            .slice(0, 24)
        : undefined;
      submit({
        event: "operation_error",
        correlationId,
        status,
        errorType,
        errorId,
        ...context(request),
      });
    };

    const finish = (aborted: boolean) => {
      if (finished) return;
      finished = true;
      const route = request.route?.path;
      const routeTemplate = typeof route === "string" ? route : "unmatched";
      submit({
        event: response.statusCode >= 400 || aborted ? "response_error" : "response",
        correlationId,
        method: request.method,
        route: routeTemplate.slice(0, 180),
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        ...(aborted ? { aborted: true } : {}),
        ...context(request),
        ...responseFields,
      });
    };
    response.once("finish", () => finish(false));
    response.once("close", () => finish(true));
    runWithAuditReporter((error, stage, paymentReference) => {
      const candidate = error instanceof Error ? error : undefined;
      const errorType =
        candidate?.name && /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(candidate.name)
          ? candidate.name
          : "UnknownError";
      const paymentId = fingerprint("payment", paymentReference);
      submit({
        event: "operation_error",
        correlationId,
        recovered: true,
        stage: /^[a-z_]{1,64}$/.test(stage) ? stage : "payment_operation",
        errorType,
        ...(paymentId ? { paymentId } : {}),
        ...context(request),
      });
    }, next);
  };
}

const defaultSink = env.nodeEnv === "test" ? null : new AuditFile(env.requestAuditLogDirectory);
export const requestLogger = defaultSink
  ? createRequestLogger({ sink: defaultSink, pseudonymKey: env.sessionSecret ?? randomBytes(32) })
  : (((_request, _response, next) => next()) as RequestHandler);

export function flushRequestAuditLog(): Promise<void> {
  return defaultSink?.flush() ?? Promise.resolve();
}
