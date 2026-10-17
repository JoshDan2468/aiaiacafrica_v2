import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "migrations/20260917000000000_professional-dual-currency-pricing.ts",
  ),
  "utf8",
);

test("dual-currency migration configures approved Professional prices", () => {
  assert.match(migration, /amount_minor = 150000/);
  assert.match(migration, /'NGN', 210000000, true/);
});

test("dual-currency migration never rewrites historical payment snapshots", () => {
  assert.doesNotMatch(migration, /UPDATE\s+payment_transactions/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+payment_transactions/i);
});
