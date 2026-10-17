/** Run with `npx tsx test/super-admin-promotion.acceptance.ts` against local aiaiac_dev only. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { createConfiguredApplication } from "../src/app";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { env } from "../src/config/env";
import { getPermissionsForRole } from "../src/config/permissions";
import { postgresAdminAuditRepository } from "../src/repositories/adminAudit.repository";
import { postgresAdminRepository } from "../src/repositories/admin.repository";
import {
  AdminUserPromotionPermissionError,
  AdminUserService,
} from "../src/services/adminUser.service";
import { hashPassword } from "../src/services/password.service";
import type { AdminRole, SafeAdmin } from "../src/types/admin";

async function main() {
  const url = env.databaseUrl ? new URL(env.databaseUrl) : null;
  if (
    !url ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/aiaiac_dev"
  ) {
    throw new Error(
      "This acceptance runs only against local aiaiac_dev PostgreSQL",
    );
  }
  const pool = getDatabasePool();
  if (!pool || !env.sessionSecret)
    throw new Error("Local database and session secret required");

  const marker = randomBytes(6).toString("hex");
  const roles: AdminRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "FINANCE",
    "REGISTRATION_MANAGER",
    "COMMUNICATIONS",
  ];
  const people = roles.map((role, index) => ({
    id: randomUUID(),
    role,
    email: `promotion-${index}-${marker}@example.invalid`,
    password: `Synthetic-${randomUUID()}-A1`,
  }));
  const [owner, target, ...otherUsers] = people;
  if (!owner || !target) throw new Error("Synthetic fixture incomplete");
  const ids = people.map((person) => person.id);
  const service = new AdminUserService(
    postgresAdminRepository,
    postgresAdminAuditRepository,
  );
  try {
    for (const person of people) {
      await pool.query(
        `INSERT INTO admins (id,full_name,email,password_hash,role)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          person.id,
          `Synthetic ${person.role}`,
          person.email,
          await hashPassword(person.password),
          person.role,
        ],
      );
    }
    const before = await pool.query<{
      id: string;
      email: string;
      password_hash: string;
      role: string;
      is_active: boolean;
    }>(
      "SELECT id,email,password_hash,role,is_active FROM admins WHERE id=ANY($1::uuid[]) ORDER BY id",
      [ids],
    );
    const targetBefore = before.rows.find((row) => row.id === target.id);
    assert.ok(targetBefore);
    const app = createConfiguredApplication();
    const targetAgent = request.agent(app);
    const ownerAgent = request.agent(app);
    await targetAgent
      .post("/api/auth/login")
      .send({ email: target.email, password: target.password })
      .expect(200);
    await targetAgent.get("/api/admin/users").expect(403);
    await ownerAgent
      .post("/api/auth/login")
      .send({ email: owner.email, password: owner.password })
      .expect(200);

    for (const role of [
      "ADMIN",
      "FINANCE",
      "REGISTRATION_MANAGER",
      "COMMUNICATIONS",
    ] as const) {
      const person = people.find((item) => item.role === role);
      assert.ok(person);
      const actor: SafeAdmin = {
        id: person.id,
        fullName: `Synthetic ${role}`,
        email: person.email,
        role,
        permissions: getPermissionsForRole(role),
      };
      await assert.rejects(
        service.promoteToSuperAdmin(actor, target.id),
        AdminUserPromotionPermissionError,
      );
      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: person.email, password: person.password })
        .expect(200);
      await agent
        .patch(`/api/admin/users/${target.id}/promote`)
        .set("X-AIAIAC-CSRF", "1")
        .set("Origin", "http://localhost:5173")
        .expect(403);
    }
    await ownerAgent
      .patch(`/api/admin/users/${target.id}/promote`)
      .set("X-AIAIAC-CSRF", "1")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    const after = await pool.query<{
      id: string;
      email: string;
      password_hash: string;
      role: string;
      is_active: boolean;
    }>(
      "SELECT id,email,password_hash,role,is_active FROM admins WHERE id=ANY($1::uuid[]) ORDER BY id",
      [ids],
    );
    assert.equal(after.rows.length, before.rows.length);
    const targetAfter = after.rows.find((row) => row.id === target.id);
    assert.deepEqual(targetAfter, { ...targetBefore, role: "SUPER_ADMIN" });
    for (const person of [owner, ...otherUsers]) {
      assert.deepEqual(
        after.rows.find((row) => row.id === person.id),
        before.rows.find((row) => row.id === person.id),
      );
    }
    const sameEmailCount = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM admins WHERE email=$1",
      [target.email],
    );
    assert.equal(sameEmailCount.rows[0]?.count, 1);
    const currentSession = await targetAgent.get("/api/auth/me").expect(200);
    assert.equal(currentSession.body.data.admin.id, target.id);
    assert.equal(currentSession.body.data.admin.role, "SUPER_ADMIN");
    await targetAgent.get("/api/admin/users").expect(200);
    await targetAgent.post("/api/auth/logout").expect(200);
    const relogin = await targetAgent
      .post("/api/auth/login")
      .send({ email: target.email, password: target.password })
      .expect(200);
    assert.equal(relogin.body.data.admin.id, target.id);
    assert.equal(relogin.body.data.admin.role, "SUPER_ADMIN");

    const audit = await pool.query<{
      admin_id: string;
      entity_id: string;
      metadata: { targetEmail: string; previousRole: string; role: string };
    }>(
      `SELECT admin_id,entity_id,metadata FROM admin_audit_logs
       WHERE action='USER_ROLE_CHANGED' AND entity_type='ADMIN_USER' AND entity_id=$1`,
      [target.id],
    );
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0]?.admin_id, owner.id);
    assert.equal(audit.rows[0]?.entity_id, target.id);
    assert.deepEqual(audit.rows[0]?.metadata, {
      targetEmail: target.email,
      previousRole: "ADMIN",
      role: "SUPER_ADMIN",
    });
    console.log(
      "Super Admin promotion PostgreSQL acceptance PASS: role denials, same account and password, immediate and renewed authorization, attributed audit, no duplicate or unrelated changes",
    );
  } finally {
    await pool.query(
      "DELETE FROM session WHERE sess->>'adminId'=ANY($1::text[])",
      [ids],
    );
    await pool.query(
      "DELETE FROM admin_audit_logs WHERE admin_id=ANY($1::uuid[])",
      [ids],
    );
    await pool.query("DELETE FROM admins WHERE id=ANY($1::uuid[])", [ids]);
    const remaining = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM admins WHERE id=ANY($1::uuid[])",
      [ids],
    );
    assert.equal(remaining.rows[0]?.count, 0);
    await closeDatabasePool();
  }
}

void main().catch((error) => {
  console.error(
    "Super Admin promotion acceptance failed",
    error instanceof Error ? error.message : "unknown",
  );
  process.exitCode = 1;
});
