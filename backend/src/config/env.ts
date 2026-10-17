import dotenv from "dotenv";
import { loadAbstractAiConfig, type AbstractAiConfig } from "./abstractAi";
import path from "node:path";
import { z } from "zod";
import type { PaymentNotificationRole } from "../types/paymentCompletion";
import type { EnquiryNotificationRole } from "../types/enquiry";

dotenv.config({ quiet: true });

const rawEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).optional(),
  CLIENT_URL: z.string().optional(),
  PUBLIC_FRONTEND_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DATABASE_SSL_MODE: z.enum(["disable", "verify-full"]).default("disable"),
  DATABASE_SSL_CA_FILE: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  SESSION_COOKIE_SAME_SITE: z.enum(["lax", "none"]).default("lax"),
  REQUEST_AUDIT_LOG_DIR: z.string().optional(),
  ADMIN_SESSION_IDLE_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(720)
    .default(30),
  ADMIN_SESSION_ABSOLUTE_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(12),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10_000).optional(),
  DELEGATE_REGISTRATION_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  DELEGATE_REGISTRATION_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional(),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),
  EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  EMAIL_VERIFICATION_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .optional(),
  REGISTRATION_RECOVERY_TOKEN_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(120)
    .default(30),
  REGISTRATION_CONTINUATION_TOKEN_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),
  REGISTRATION_RECOVERY_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  REGISTRATION_RECOVERY_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .optional(),
  COMMERCIAL_APPLICATION_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  COMMERCIAL_APPLICATION_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .optional(),
  ABSTRACT_SUBMISSION_DEADLINE: z.string().default("2027-03-15T23:59:59+01:00"),
  ABSTRACT_CONTINUATION_TOKEN_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),
  ABSTRACT_RECOVERY_TOKEN_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(120)
    .default(30),
  ABSTRACT_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  ABSTRACT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).optional(),
  ENQUIRY_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).optional(),
  ENQUIRY_NOTIFICATION_ROLES: z.string().default("SUPER_ADMIN,COMMUNICATIONS"),
  STUDENT_EVIDENCE_ENABLED: z.enum(["true", "false"]).default("true"),
  STUDENT_EVIDENCE_STORAGE_DIR: z.string().optional(),
  STUDENT_EVIDENCE_CLAMD_SOCKET: z.string().optional(),
  STUDENT_EVIDENCE_TOKEN_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),
  STUDENT_EVIDENCE_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  STUDENT_EVIDENCE_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .optional(),
  STUDENT_VERIFICATION_RECOVERY_TOKEN_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(120)
    .default(30),
  STUDENT_VERIFICATION_WORKFLOW_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  STUDENT_VERIFICATION_WORKFLOW_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .optional(),
  ADMIN_INVITATION_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .max(3_600_000)
    .default(900_000),
  ADMIN_INVITATION_VALIDATE_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional(),
  ADMIN_INVITATION_ACCEPT_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .optional(),
  ADMIN_INVITATION_EXPIRY_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(48),
  ADMIN_ALLOWED_EMAIL_DOMAINS: z.string().optional(),
  ADMIN_FRONTEND_URL: z.string().optional(),
  MAILJET_API_KEY: z.string().optional(),
  MAILJET_SECRET_KEY: z.string().optional(),
  MAILJET_FROM_EMAIL: z.string().optional(),
  MAILJET_FROM_NAME: z.string().default("AIAIAC"),
  COMMUNICATIONS_PUBLIC_API_URL: z
    .url({ protocol: /^https$/ })
    .refine((value) => {
      const url = new URL(value);
      return (
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    }, "must be an HTTPS API origin without a path or credentials")
    .optional(),
  COMMUNICATIONS_UNSUBSCRIBE_SECRET: z.string().min(32).optional(),
  COMMUNICATIONS_MAILJET_WEBHOOK_SECRET: z.string().min(32).optional(),
  COMMUNICATIONS_BULK_SEND_ENABLED: z.enum(["true", "false"]).default("false"),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET_HASH: z.string().optional(),
  FLUTTERWAVE_CALLBACK_URL: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_CALLBACK_URL: z.string().optional(),
  PAYMENT_NOTIFICATION_ROLES: z.string().default("SUPER_ADMIN"),
  REGISTRATION_NOTIFICATION_ROLES: z.string().default("SUPER_ADMIN,ADMIN"),
  REGISTRATION_NOTIFICATION_EMAIL: z.string().email().optional(),
  INITIAL_SUPER_ADMIN_NAME: z.string().optional(),
  INITIAL_SUPER_ADMIN_EMAIL: z.string().optional(),
  INITIAL_SUPER_ADMIN_PASSWORD: z.string().optional(),
});

export interface EnvironmentConfig {
  readonly abstractAi: AbstractAiConfig | null;
  readonly nodeEnv: "development" | "test" | "production";
  readonly port: number;
  readonly trustProxyHops: number;
  readonly clientOrigins: readonly string[];
  readonly publicFrontendUrl: string;
  readonly databaseUrl?: string;
  readonly databaseSslMode: "disable" | "verify-full";
  readonly databaseSslCaFile?: string;
  readonly sessionSecret?: string;
  readonly sessionCookieSameSite: "lax" | "none";
  readonly requestAuditLogDirectory: string;
  readonly adminSessionIdleMs: number;
  readonly adminSessionAbsoluteMs: number;
  readonly loginRateLimitWindowMs: number;
  readonly loginRateLimitMax: number;
  readonly delegateRegistrationRateLimitWindowMs: number;
  readonly delegateRegistrationRateLimitMax: number;
  readonly emailVerificationTokenTtlHours: number;
  readonly emailVerificationRateLimitWindowMs: number;
  readonly emailVerificationRateLimitMax: number;
  readonly registrationRecoveryTokenTtlMinutes: number;
  readonly registrationContinuationTokenTtlHours: number;
  readonly registrationRecoveryRateLimitWindowMs: number;
  readonly registrationRecoveryRateLimitMax: number;
  readonly commercialApplicationRateLimitWindowMs: number;
  readonly commercialApplicationRateLimitMax: number;
  readonly abstractSubmissionDeadline: Date;
  readonly abstractContinuationTokenTtlHours: number;
  readonly abstractRecoveryTokenTtlMinutes: number;
  readonly abstractRateLimitWindowMs: number;
  readonly abstractRateLimitMax: number;
  readonly enquiryRateLimitWindowMs: number;
  readonly enquiryRateLimitMax: number;
  readonly enquiryNotificationRoles: readonly EnquiryNotificationRole[];
  readonly studentEvidenceEnabled: boolean;
  readonly studentEvidenceStorageDirectory: string;
  readonly studentEvidenceClamdSocket?: string;
  readonly studentEvidenceTokenTtlHours: number;
  readonly studentEvidenceRateLimitWindowMs: number;
  readonly studentEvidenceRateLimitMax: number;
  readonly studentVerificationRecoveryTokenTtlMinutes: number;
  readonly studentVerificationWorkflowRateLimitWindowMs: number;
  readonly studentVerificationWorkflowRateLimitMax: number;
  readonly adminInvitationRateLimitWindowMs: number;
  readonly adminInvitationValidateRateLimitMax: number;
  readonly adminInvitationAcceptRateLimitMax: number;
  readonly adminInvitationExpiryHours: number;
  readonly adminAllowedEmailDomains: readonly string[];
  readonly adminFrontendUrl: string;
  readonly communicationsBulkSendEnabled: boolean;
  readonly mailjet?: {
    readonly apiKey: string;
    readonly secretKey: string;
    readonly fromEmail: string;
    readonly fromName: string;
  };
  readonly flutterwave?: {
    readonly secretKey: string;
    readonly webhookSecretHash: string;
    readonly callbackUrl: string;
  };
  readonly paystack?: {
    readonly secretKey: string;
    readonly callbackUrl: string;
  };
  readonly paymentNotificationRoles: readonly PaymentNotificationRole[];
  readonly registrationNotificationRoles: readonly string[];
  readonly registrationNotificationEmail?: string | undefined;
  readonly initialSuperAdmin: {
    readonly fullName?: string;
    readonly email?: string;
    readonly password?: string;
  };
}

function configurationError(variable: string, requirement: string): Error {
  return new Error(
    `Invalid environment configuration: ${variable} ${requirement}`,
  );
}

function parseClientOrigins(value: string): string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes("*")) {
    throw configurationError(
      "CLIENT_URL",
      "must contain explicit HTTP(S) origins",
    );
  }

  const normalized = origins.map((origin) => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw configurationError(
        "CLIENT_URL",
        "must contain valid HTTP(S) origins",
      );
    }

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw configurationError(
        "CLIENT_URL",
        "must contain origin-only HTTP(S) URLs",
      );
    }

    return url.origin;
  });

  return [...new Set(normalized)];
}

function parseDatabaseUrl(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw configurationError("DATABASE_URL", "must be a valid PostgreSQL URL");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw configurationError(
      "DATABASE_URL",
      "must use the postgres or postgresql protocol",
    );
  }

  return candidate;
}

function parseOrigin(variable: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw configurationError(variable, "must be a valid HTTP(S) origin");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw configurationError(variable, "must be an origin-only HTTP(S) URL");
  }
  return url.origin;
}

function parseHttpUrl(variable: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw configurationError(variable, "must be a valid HTTP(S) URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw configurationError(variable, "must be a safe HTTP(S) URL");
  }
  return url.toString();
}

function parseZonedDateTime(variable: string, value: string): Date {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw configurationError(
      variable,
      "must include an explicit timezone offset",
    );
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw configurationError(variable, "must be a valid ISO date-time");
  }
  return parsed;
}

function parseAllowedEmailDomains(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  const domains = value
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  if (
    domains.some((domain) => !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain))
  ) {
    throw configurationError(
      "ADMIN_ALLOWED_EMAIL_DOMAINS",
      "contains an invalid domain",
    );
  }
  return [...new Set(domains)];
}

function parsePaymentNotificationRoles(
  value: string,
): PaymentNotificationRole[] {
  const roles = value
    .split(",")
    .map((role) => role.trim().toUpperCase())
    .filter(Boolean);
  if (
    roles.length === 0 ||
    roles.some((role) => !["SUPER_ADMIN", "FINANCE"].includes(role))
  ) {
    throw configurationError(
      "PAYMENT_NOTIFICATION_ROLES",
      "may contain only SUPER_ADMIN and FINANCE",
    );
  }
  return [...new Set(roles)] as PaymentNotificationRole[];
}

function parseRegistrationNotificationRoles(value: string): string[] {
  const roles = value
    .split(",")
    .map((role) => role.trim().toUpperCase())
    .filter(Boolean);
  if (
    !roles.length ||
    roles.some((role) => !["SUPER_ADMIN", "ADMIN"].includes(role))
  ) {
    throw configurationError(
      "REGISTRATION_NOTIFICATION_ROLES",
      "may contain only SUPER_ADMIN and ADMIN",
    );
  }
  return [...new Set(roles)];
}

function parseEnquiryNotificationRoles(
  value: string,
): EnquiryNotificationRole[] {
  const roles = value
    .split(",")
    .map((role) => role.trim().toUpperCase())
    .filter(Boolean);
  const allowed = [
    "SUPER_ADMIN",
    "ADMIN",
    "REGISTRATION_MANAGER",
    "COMMUNICATIONS",
  ];
  if (!roles.length || roles.some((role) => !allowed.includes(role))) {
    throw configurationError(
      "ENQUIRY_NOTIFICATION_ROLES",
      "may contain only SUPER_ADMIN, ADMIN, REGISTRATION_MANAGER, and COMMUNICATIONS",
    );
  }
  return [...new Set(roles)] as EnquiryNotificationRole[];
}

function parseStudentEvidenceStorageDirectory(
  value: string | undefined,
): string {
  const resolved = path.resolve(
    value?.trim() || path.join(process.cwd(), ".private", "student-evidence"),
  );
  const segments = resolved.toLowerCase().split(path.sep);
  const frontendIndex = segments.lastIndexOf("frontend");
  if (
    segments.includes("public") ||
    (frontendIndex >= 0 && segments.slice(frontendIndex + 1).includes("public"))
  ) {
    throw configurationError(
      "STUDENT_EVIDENCE_STORAGE_DIR",
      "must not be inside a public or frontend/public directory",
    );
  }
  return resolved;
}

function parseRequestAuditLogDirectory(value: string | undefined): string {
  const resolved = path.resolve(
    value?.trim() || path.join(process.cwd(), ".private", "audit-logs"),
  );
  const segments = resolved.toLowerCase().split(path.sep);
  if (segments.includes("public")) {
    throw configurationError(
      "REQUEST_AUDIT_LOG_DIR",
      "must not be inside a public directory",
    );
  }
  return resolved;
}

export function loadEnvironment(
  source: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): EnvironmentConfig {
  const parsed = rawEnvironmentSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const clientUrl = parsed.data.CLIENT_URL?.trim();
  if (parsed.data.NODE_ENV === "production" && !clientUrl) {
    throw configurationError("CLIENT_URL", "is required in production");
  }
  const clientOrigins = parseClientOrigins(
    clientUrl || "http://localhost:5173",
  );
  if (
    parsed.data.NODE_ENV === "production" &&
    clientOrigins.length > 1 &&
    !parsed.data.PUBLIC_FRONTEND_URL?.trim()
  ) {
    throw configurationError(
      "PUBLIC_FRONTEND_URL",
      "is required when CLIENT_URL contains multiple production origins",
    );
  }
  const publicFrontendUrl = parseOrigin(
    "PUBLIC_FRONTEND_URL",
    parsed.data.PUBLIC_FRONTEND_URL?.trim() || clientOrigins[0]!,
  );
  if (!clientOrigins.includes(publicFrontendUrl)) {
    throw configurationError(
      "PUBLIC_FRONTEND_URL",
      "must be an approved CLIENT_URL origin",
    );
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    !publicFrontendUrl.startsWith("https://")
  ) {
    throw configurationError(
      "PUBLIC_FRONTEND_URL",
      "must use HTTPS in production",
    );
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    clientOrigins.some((origin) => !origin.startsWith("https://"))
  ) {
    throw configurationError("CLIENT_URL", "must use HTTPS in production");
  }
  const databaseUrl = parseDatabaseUrl(parsed.data.DATABASE_URL);
  if (parsed.data.NODE_ENV === "production" && !databaseUrl) {
    throw configurationError("DATABASE_URL", "is required in production");
  }

  const sessionSecret = parsed.data.SESSION_SECRET?.trim();
  if (
    sessionSecret &&
    (sessionSecret.length < 32 || /^REPLACE_/i.test(sessionSecret))
  ) {
    throw configurationError(
      "SESSION_SECRET",
      "must be at least 32 characters and not a placeholder",
    );
  }
  if (parsed.data.NODE_ENV === "production" && !sessionSecret) {
    throw configurationError("SESSION_SECRET", "is required in production");
  }

  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.STUDENT_EVIDENCE_ENABLED === "true"
  ) {
    if (
      !parsed.data.STUDENT_EVIDENCE_STORAGE_DIR?.trim() ||
      !path.isAbsolute(parsed.data.STUDENT_EVIDENCE_STORAGE_DIR.trim())
    ) {
      throw configurationError(
        "STUDENT_EVIDENCE_STORAGE_DIR",
        "must be an explicit absolute private path",
      );
    }
    if (
      !parsed.data.STUDENT_EVIDENCE_CLAMD_SOCKET?.trim() ||
      !path.isAbsolute(parsed.data.STUDENT_EVIDENCE_CLAMD_SOCKET.trim())
    ) {
      throw configurationError(
        "STUDENT_EVIDENCE_CLAMD_SOCKET",
        "must be an absolute Unix socket path",
      );
    }
  }

  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.DATABASE_SSL_MODE !== "verify-full"
  ) {
    throw configurationError(
      "DATABASE_SSL_MODE",
      "must be verify-full in production",
    );
  }
  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.TRUST_PROXY_HOPS === undefined
  ) {
    throw configurationError(
      "TRUST_PROXY_HOPS",
      "must explicitly be 0 for direct TLS or the trusted proxy hop count",
    );
  }

  const adminFrontendUrl = parseOrigin(
    "ADMIN_FRONTEND_URL",
    parsed.data.ADMIN_FRONTEND_URL?.trim() || clientOrigins[0]!,
  );
  if (
    parsed.data.NODE_ENV === "production" &&
    !clientOrigins.includes(adminFrontendUrl)
  ) {
    throw configurationError(
      "ADMIN_FRONTEND_URL",
      "must be an approved CLIENT_URL origin",
    );
  }
  const mailjetValues = [
    parsed.data.MAILJET_API_KEY?.trim(),
    parsed.data.MAILJET_SECRET_KEY?.trim(),
    parsed.data.MAILJET_FROM_EMAIL?.trim().toLowerCase(),
  ];
  const hasAnyMailjetValue = mailjetValues.some(Boolean);
  const hasAllMailjetValues = mailjetValues.every(Boolean);
  if (hasAllMailjetValues && !z.email().safeParse(mailjetValues[2]).success) {
    throw configurationError(
      "MAILJET_FROM_EMAIL",
      "must be a valid sender email",
    );
  }
  if (hasAnyMailjetValue && !hasAllMailjetValues) {
    throw configurationError(
      "MAILJET_API_KEY, MAILJET_SECRET_KEY, and MAILJET_FROM_EMAIL",
      "must be configured together",
    );
  }
  if (parsed.data.NODE_ENV === "production" && !hasAllMailjetValues) {
    throw configurationError(
      "Mailjet credentials",
      "are required in production",
    );
  }
  const flutterwaveSecretKey = parsed.data.FLUTTERWAVE_SECRET_KEY?.trim();
  const flutterwaveWebhookSecretHash = parsed.data.FLUTTERWAVE_WEBHOOK_SECRET_HASH?.trim();
  const flutterwaveCallback = parsed.data.FLUTTERWAVE_CALLBACK_URL?.trim();
  if (
    [flutterwaveSecretKey, flutterwaveWebhookSecretHash, flutterwaveCallback].some(Boolean) &&
    (!flutterwaveSecretKey || flutterwaveSecretKey.length < 16 ||
      !flutterwaveWebhookSecretHash || flutterwaveWebhookSecretHash.length < 32 ||
      !flutterwaveCallback)
  ) {
    throw configurationError(
      "FLUTTERWAVE_*",
      "require a secret key, random webhook hash of at least 32 characters and callback URL together",
    );
  }
  const flutterwaveCallbackUrl = flutterwaveCallback
    ? parseHttpUrl("FLUTTERWAVE_CALLBACK_URL", flutterwaveCallback)
    : undefined;
  if (flutterwaveCallbackUrl) {
    const callback = new URL(flutterwaveCallbackUrl);
    if (
      !clientOrigins.includes(callback.origin) ||
      callback.pathname !== "/registration/payment/callback" ||
      callback.search || callback.hash || callback.username || callback.password ||
      (parsed.data.NODE_ENV === "production" && callback.protocol !== "https:")
    ) {
      throw configurationError(
        "FLUTTERWAVE_CALLBACK_URL",
        "must be the callback on an approved frontend origin (HTTPS in production)",
      );
    }
  }
  const paystackSecretKey = parsed.data.PAYSTACK_SECRET_KEY?.trim();
  if (paystackSecretKey && paystackSecretKey.length < 16) {
    throw configurationError("PAYSTACK_SECRET_KEY", "is invalid");
  }
  if (parsed.data.NODE_ENV === "production" && !paystackSecretKey) {
    throw configurationError(
      "PAYSTACK_SECRET_KEY",
      "is required in production",
    );
  }
  const paystackCallbackUrl = parseHttpUrl(
    "PAYSTACK_CALLBACK_URL",
    parsed.data.PAYSTACK_CALLBACK_URL?.trim() ||
      "http://localhost:5173/registration/payment/callback",
  );
  if (parsed.data.NODE_ENV === "production") {
    if (!parsed.data.PAYSTACK_CALLBACK_URL?.trim()) {
      throw configurationError(
        "PAYSTACK_CALLBACK_URL",
        "is required in production",
      );
    }
    const callback = new URL(paystackCallbackUrl);
    if (
      callback.protocol !== "https:" ||
      !clientOrigins.includes(callback.origin) ||
      callback.pathname !== "/registration/payment/callback"
    ) {
      throw configurationError(
        "PAYSTACK_CALLBACK_URL",
        "must be the HTTPS callback on an approved frontend origin",
      );
    }
    if (
      parsed.data.INITIAL_SUPER_ADMIN_NAME ||
      parsed.data.INITIAL_SUPER_ADMIN_EMAIL ||
      parsed.data.INITIAL_SUPER_ADMIN_PASSWORD
    ) {
      throw configurationError(
        "INITIAL_SUPER_ADMIN_*",
        "must not be set in the running production application",
      );
    }
  }

  const config: EnvironmentConfig = {
    abstractAi: loadAbstractAiConfig(source),
    nodeEnv: parsed.data.NODE_ENV,
    communicationsBulkSendEnabled:
      parsed.data.COMMUNICATIONS_BULK_SEND_ENABLED === "true",
    port: parsed.data.PORT,
    trustProxyHops: parsed.data.TRUST_PROXY_HOPS ?? 0,
    sessionCookieSameSite: parsed.data.SESSION_COOKIE_SAME_SITE,
    requestAuditLogDirectory: parseRequestAuditLogDirectory(
      parsed.data.REQUEST_AUDIT_LOG_DIR,
    ),
    clientOrigins,
    publicFrontendUrl,
    databaseSslMode: parsed.data.DATABASE_SSL_MODE,
    ...(parsed.data.DATABASE_SSL_CA_FILE?.trim()
      ? { databaseSslCaFile: parsed.data.DATABASE_SSL_CA_FILE.trim() }
      : {}),
    adminSessionIdleMs: parsed.data.ADMIN_SESSION_IDLE_MINUTES * 60_000,
    adminSessionAbsoluteMs:
      parsed.data.ADMIN_SESSION_ABSOLUTE_HOURS * 3_600_000,
    loginRateLimitWindowMs: parsed.data.LOGIN_RATE_LIMIT_WINDOW_MS,
    loginRateLimitMax:
      parsed.data.LOGIN_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 10 : 100),
    delegateRegistrationRateLimitWindowMs:
      parsed.data.DELEGATE_REGISTRATION_RATE_LIMIT_WINDOW_MS,
    delegateRegistrationRateLimitMax:
      parsed.data.DELEGATE_REGISTRATION_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 20 : 100),
    emailVerificationTokenTtlHours:
      parsed.data.EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
    emailVerificationRateLimitWindowMs:
      parsed.data.EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS,
    emailVerificationRateLimitMax:
      parsed.data.EMAIL_VERIFICATION_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 8 : 100),
    registrationRecoveryTokenTtlMinutes:
      parsed.data.REGISTRATION_RECOVERY_TOKEN_TTL_MINUTES,
    registrationContinuationTokenTtlHours:
      parsed.data.REGISTRATION_CONTINUATION_TOKEN_TTL_HOURS,
    registrationRecoveryRateLimitWindowMs:
      parsed.data.REGISTRATION_RECOVERY_RATE_LIMIT_WINDOW_MS,
    registrationRecoveryRateLimitMax:
      parsed.data.REGISTRATION_RECOVERY_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 8 : 100),
    commercialApplicationRateLimitWindowMs:
      parsed.data.COMMERCIAL_APPLICATION_RATE_LIMIT_WINDOW_MS,
    commercialApplicationRateLimitMax:
      parsed.data.COMMERCIAL_APPLICATION_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 10 : 100),
    abstractSubmissionDeadline: parseZonedDateTime(
      "ABSTRACT_SUBMISSION_DEADLINE",
      parsed.data.ABSTRACT_SUBMISSION_DEADLINE,
    ),
    abstractContinuationTokenTtlHours:
      parsed.data.ABSTRACT_CONTINUATION_TOKEN_TTL_HOURS,
    abstractRecoveryTokenTtlMinutes:
      parsed.data.ABSTRACT_RECOVERY_TOKEN_TTL_MINUTES,
    abstractRateLimitWindowMs: parsed.data.ABSTRACT_RATE_LIMIT_WINDOW_MS,
    abstractRateLimitMax:
      parsed.data.ABSTRACT_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 10 : 100),
    enquiryRateLimitWindowMs: parsed.data.ENQUIRY_RATE_LIMIT_WINDOW_MS,
    enquiryRateLimitMax:
      parsed.data.ENQUIRY_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 10 : 100),
    enquiryNotificationRoles: parseEnquiryNotificationRoles(
      parsed.data.ENQUIRY_NOTIFICATION_ROLES,
    ),
    studentEvidenceEnabled: parsed.data.STUDENT_EVIDENCE_ENABLED === "true",
    studentEvidenceStorageDirectory: parseStudentEvidenceStorageDirectory(
      parsed.data.STUDENT_EVIDENCE_STORAGE_DIR,
    ),
    ...(parsed.data.STUDENT_EVIDENCE_CLAMD_SOCKET?.trim()
      ? {
          studentEvidenceClamdSocket:
            parsed.data.STUDENT_EVIDENCE_CLAMD_SOCKET.trim(),
        }
      : {}),
    studentEvidenceTokenTtlHours: parsed.data.STUDENT_EVIDENCE_TOKEN_TTL_HOURS,
    studentEvidenceRateLimitWindowMs:
      parsed.data.STUDENT_EVIDENCE_RATE_LIMIT_WINDOW_MS,
    studentEvidenceRateLimitMax:
      parsed.data.STUDENT_EVIDENCE_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 10 : 100),
    studentVerificationRecoveryTokenTtlMinutes:
      parsed.data.STUDENT_VERIFICATION_RECOVERY_TOKEN_TTL_MINUTES,
    studentVerificationWorkflowRateLimitWindowMs:
      parsed.data.STUDENT_VERIFICATION_WORKFLOW_RATE_LIMIT_WINDOW_MS,
    studentVerificationWorkflowRateLimitMax:
      parsed.data.STUDENT_VERIFICATION_WORKFLOW_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 10 : 100),
    adminInvitationRateLimitWindowMs:
      parsed.data.ADMIN_INVITATION_RATE_LIMIT_WINDOW_MS,
    adminInvitationValidateRateLimitMax:
      parsed.data.ADMIN_INVITATION_VALIDATE_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 60 : 500),
    adminInvitationAcceptRateLimitMax:
      parsed.data.ADMIN_INVITATION_ACCEPT_RATE_LIMIT_MAX ??
      (parsed.data.NODE_ENV === "production" ? 10 : 100),
    adminInvitationExpiryHours: parsed.data.ADMIN_INVITATION_EXPIRY_HOURS,
    adminAllowedEmailDomains: parseAllowedEmailDomains(
      parsed.data.ADMIN_ALLOWED_EMAIL_DOMAINS,
    ),
    adminFrontendUrl,
    paymentNotificationRoles: parsePaymentNotificationRoles(
      parsed.data.PAYMENT_NOTIFICATION_ROLES,
    ),
    registrationNotificationRoles: parseRegistrationNotificationRoles(
      parsed.data.REGISTRATION_NOTIFICATION_ROLES,
    ),
    registrationNotificationEmail: parsed.data.REGISTRATION_NOTIFICATION_EMAIL,
    initialSuperAdmin: {
      ...(parsed.data.INITIAL_SUPER_ADMIN_NAME
        ? { fullName: parsed.data.INITIAL_SUPER_ADMIN_NAME }
        : {}),
      ...(parsed.data.INITIAL_SUPER_ADMIN_EMAIL
        ? { email: parsed.data.INITIAL_SUPER_ADMIN_EMAIL }
        : {}),
      ...(parsed.data.INITIAL_SUPER_ADMIN_PASSWORD
        ? { password: parsed.data.INITIAL_SUPER_ADMIN_PASSWORD }
        : {}),
    },
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(sessionSecret ? { sessionSecret } : {}),
    ...(hasAllMailjetValues
      ? {
          mailjet: {
            apiKey: mailjetValues[0]!,
            secretKey: mailjetValues[1]!,
            fromEmail: mailjetValues[2]!,
            fromName: parsed.data.MAILJET_FROM_NAME.trim() || "AIAIAC",
          },
        }
      : {}),
    ...(flutterwaveSecretKey && flutterwaveWebhookSecretHash && flutterwaveCallbackUrl
      ? { flutterwave: {
          secretKey: flutterwaveSecretKey,
          webhookSecretHash: flutterwaveWebhookSecretHash,
          callbackUrl: flutterwaveCallbackUrl,
        } }
      : {}),
    ...(paystackSecretKey
      ? {
          paystack: {
            secretKey: paystackSecretKey,
            callbackUrl: paystackCallbackUrl,
          },
        }
      : {}),
  };

  return Object.freeze(config);
}

export const env = loadEnvironment();
