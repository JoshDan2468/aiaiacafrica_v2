import type { Session, SessionData } from "express-session";

type AdminSession = Session & Partial<SessionData>;

export interface AdminSessionPolicy {
  readonly idleMs: number;
  readonly absoluteMs: number;
  readonly now?: () => number;
}

export type AdminSessionExpiryReason = "INACTIVITY" | "ABSOLUTE" | "INVALID";

export function getAdminSessionExpiry(
  session: AdminSession,
  policy: AdminSessionPolicy,
): AdminSessionExpiryReason | null {
  const createdAt = session.adminSessionCreatedAt;
  const lastActivityAt = session.adminLastActivityAt;
  const now = (policy.now ?? Date.now)();
  if (
    typeof createdAt !== "number" ||
    typeof lastActivityAt !== "number" ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(lastActivityAt) ||
    createdAt > now ||
    lastActivityAt < createdAt ||
    lastActivityAt > now
  )
    return "INVALID";
  if (now >= createdAt + policy.absoluteMs) return "ABSOLUTE";
  if (now >= lastActivityAt + policy.idleMs) return "INACTIVITY";
  return null;
}

export function getAdminSessionDeadlines(
  session: AdminSession,
  policy: AdminSessionPolicy,
) {
  return {
    inactivityExpiresAt: new Date(
      session.adminLastActivityAt! + policy.idleMs,
    ).toISOString(),
    absoluteExpiresAt: new Date(
      session.adminSessionCreatedAt! + policy.absoluteMs,
    ).toISOString(),
  };
}

export function refreshAdminSession(
  session: AdminSession,
  policy: AdminSessionPolicy,
): void {
  const now = (policy.now ?? Date.now)();
  session.adminLastActivityAt = now;
  // The browser cookie and PostgreSQL row may slide, but never beyond login + absoluteMs.
  session.cookie.maxAge = Math.max(
    1,
    session.adminSessionCreatedAt! + policy.absoluteMs - now,
  );
}
