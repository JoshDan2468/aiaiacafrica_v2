/** Run directly with `npx tsx test/admin-session.acceptance.ts` against local PostgreSQL. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createConfiguredApplication } from "../src/app";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { env } from "../src/config/env";
import { hashPassword } from "../src/services/password.service";

async function main(): Promise<void> {
  const pool = getDatabasePool();
  if (!pool || !env.sessionSecret)
    throw new Error("Local database and session secret are required");
  const id = randomUUID();
  const email = `session-acceptance-${id}@example.invalid`;
  const password = `Acceptance-${randomUUID()}-A1`;
  try {
    await pool.query(
      `INSERT INTO admins (id, full_name, email, password_hash, role)
       VALUES ($1, 'Session Acceptance', $2, $3, 'ADMIN')`,
      [id, email, await hashPassword(password)],
    );
    const app = createConfiguredApplication();
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);
    const cookie = login.headers["set-cookie"]?.[0] as string;
    assert.ok(cookie?.includes("HttpOnly"));
    assert.equal(login.body.data.admin.id, id);
    assert.equal(
      JSON.stringify(login.body).includes(cookie.split(";")[0]!),
      false,
    );
    const session = await pool.query<{
      sess: Record<string, unknown>;
      expire: Date;
    }>("SELECT sess, expire FROM session WHERE sess->>'adminId' = $1", [id]);
    assert.equal(session.rowCount, 1);
    assert.equal(
      typeof session.rows[0]?.sess["adminSessionCreatedAt"],
      "number",
    );
    assert.equal(typeof session.rows[0]?.sess["adminLastActivityAt"], "number");
    await agent.get("/api/admin/test").expect(200);
    await agent.post("/api/auth/logout").expect(200);
    await request(app).get("/api/admin/test").set("Cookie", cookie).expect(401);
    const audit = await pool.query<{ action: string }>(
      "SELECT action FROM admin_audit_logs WHERE admin_id = $1 ORDER BY created_at",
      [id],
    );
    assert.deepEqual(
      audit.rows.map((row) => row.action),
      ["ADMIN_LOGIN", "ADMIN_LOGOUT"],
    );
    console.log(
      "PostgreSQL session acceptance passed: persistence, protected access, logout revocation, audit",
    );
  } finally {
    await pool.query("DELETE FROM session WHERE sess->>'adminId' = $1", [id]);
    await pool.query("DELETE FROM admin_audit_logs WHERE admin_id = $1", [id]);
    await pool.query("DELETE FROM admins WHERE id = $1", [id]);
    await closeDatabasePool();
  }
}

void main().catch((error) => {
  console.error(
    "Admin session acceptance failed",
    error instanceof Error ? error.message : "unknown",
  );
  process.exitCode = 1;
});
