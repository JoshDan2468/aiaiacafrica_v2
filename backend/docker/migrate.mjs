import { readFileSync } from "node:fs";
import { runner } from "node-pg-migrate";

await runner({
  databaseUrl: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(process.env.DATABASE_SSL_CA_FILE),
    },
  },
  dir: "migrations",
  ignorePattern: "package\\.json",
  direction: "up",
  migrationsTable: "pgmigrations",
  count: Infinity,
  checkOrder: true,
  singleTransaction: true,
});
