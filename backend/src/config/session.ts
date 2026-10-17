import { env } from "./env";
import connectPgSimple from "connect-pg-simple";
import type { RequestHandler } from "express";
import session, { type CookieOptions } from "express-session";
import type { Pool } from "pg";

export const authCookieName = "aiaiac.admin.sid";

interface SessionMiddlewareOptions {
  readonly pool: Pool;
  readonly secret: string;
  readonly absoluteMs: number;
  readonly production: boolean;
}

export function getAuthCookieSecurity(
  production: boolean,
  sameSite: "lax" | "none" = env.sessionCookieSameSite,
): { secure: boolean; sameSite: "lax" | "none" } {
  return { secure: production || sameSite === "none", sameSite };
}

export function getAuthCookieOptions(
  absoluteMs: number,
  production: boolean,
  sameSite: "lax" | "none" = env.sessionCookieSameSite,
): CookieOptions {
  return {
    httpOnly: true,
    ...getAuthCookieSecurity(production, sameSite),
    maxAge: absoluteMs,
    path: "/",
  };
}

export function createSessionMiddleware(
  options: SessionMiddlewareOptions,
): RequestHandler {
  const PostgreSqlStore = connectPgSimple(session);

  return session({
    name: authCookieName,
    secret: options.secret,
    store: new PostgreSqlStore({
      pool: options.pool,
      tableName: "session",
      createTableIfMissing: false,
      pruneSessionInterval: 15 * 60,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: getAuthCookieOptions(options.absoluteMs, options.production),
  });
}
