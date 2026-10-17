import { env } from "../config/env";
import { auditIdentity, type AuditIdentityKind } from "../observability/auditIdentity";

const value = process.argv[2];
const kind: AuditIdentityKind | undefined = value?.startsWith("AIAIAC-DEL-")
  ? "registration"
  : value?.startsWith("AIAIAC-PAY-") || value?.startsWith("AIAIAC-MAN-")
    ? "payment"
    : value?.includes("@")
      ? "email"
      : undefined;

if (!env.sessionSecret) {
  console.error("SESSION_SECRET is required to look up audit identifiers");
  process.exitCode = 1;
} else if (!kind || !value) {
  console.error("Provide a registration reference, payment reference, or email address");
  process.exitCode = 1;
} else {
  const id = auditIdentity(kind, value, env.sessionSecret);
  if (!id) {
    console.error("Invalid audit lookup value");
    process.exitCode = 1;
  } else {
    console.info(`${kind === "email" ? "person" : kind}Id=${id}`);
  }
}
