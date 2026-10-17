import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { env } from "./env";
import type { TransactionRunner } from "../types/database";

let pool: Pool | null = null;

export function getDatabasePool(): Pool | null {
  if (!env.databaseUrl) return null;

  if (!pool) {
    let ssl: false | { rejectUnauthorized: true; ca?: Buffer } = false;
    if (env.databaseSslMode === "verify-full") {
      try {
        ssl = {
          rejectUnauthorized: true,
          ...(env.databaseSslCaFile ? { ca: readFileSync(env.databaseSslCaFile) } : {}),
        };
      } catch {
        throw new Error("DATABASE_SSL_CA_FILE could not be read");
      }
    }
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });

    pool.on("error", (error) => {
      console.error("Unexpected PostgreSQL pool error", {
        errorType: error.name,
      });
    });
  }

  return pool;
}

export async function checkDatabaseConnection(): Promise<void> {
  const databasePool = getDatabasePool();

  if (!databasePool) {
    console.error(
      "Database readiness check failed: DATABASE_URL is not configured",
    );
    throw new Error("Database is not configured");
  }

  try {
    await databasePool.query("SELECT 1;");
  } catch (error) {
    console.error("Database readiness check failed", {
      errorType: error instanceof Error ? error.name : "UnknownDatabaseError",
    });
    throw new Error("Database connection check failed", { cause: error });
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}

/** Runs related writes on one PostgreSQL client and rolls all of them back on failure. */
export const withTransaction: TransactionRunner = async (work) => {
  const databasePool = getDatabasePool();
  if (!databasePool) throw new Error("Database is not configured");

  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
