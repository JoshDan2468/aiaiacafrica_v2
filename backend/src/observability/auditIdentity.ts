import { createHmac } from "node:crypto";

const registrationPattern = /^AIAIAC-DEL-[A-Z0-9]{8}$/;
const paymentPattern = /^AIAIAC-(?:PAY|MAN)-[A-Z0-9]{24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuditIdentityKind = "registration" | "payment" | "email";

export function auditIdentity(
  kind: AuditIdentityKind,
  value: unknown,
  key: string | Buffer,
): string | undefined {
  const pattern =
    kind === "registration"
      ? registrationPattern
      : kind === "payment"
        ? paymentPattern
        : emailPattern;
  if (typeof value !== "string" || !pattern.test(value)) return undefined;
  return createHmac("sha256", key).update(value.toLowerCase()).digest("hex").slice(0, 24);
}
