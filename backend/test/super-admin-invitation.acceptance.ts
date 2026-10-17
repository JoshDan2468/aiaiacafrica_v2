/** Run directly with `npx tsx test/super-admin-invitation.acceptance.ts` against local development PostgreSQL. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { createConfiguredApplication } from "../src/app";
import { closeDatabasePool, getDatabasePool } from "../src/config/database";
import { env } from "../src/config/env";
import { getPermissionsForRole } from "../src/config/permissions";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { postgresAdminAuditRepository } from "../src/repositories/adminAudit.repository";
import { postgresAdminInvitationRepository } from "../src/repositories/adminInvitation.repository";
import { postgresAdminRepository } from "../src/repositories/admin.repository";
import {
  AdminInvitationService,
  InvitationSuperAdminPermissionError,
} from "../src/services/adminInvitation.service";
import { AuthService, toSafeAdmin } from "../src/services/auth.service";
import { hashPassword } from "../src/services/password.service";
import type { AdminRole } from "../src/types/admin";

async function main() {
  const url = env.databaseUrl ? new URL(env.databaseUrl) : null;
  if (
    !url ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/aiaiac_dev"
  ) {
    throw new Error(
      "This acceptance test runs only against local aiaiac_dev PostgreSQL",
    );
  }
  const pool = getDatabasePool();
  if (!pool || !env.sessionSecret)
    throw new Error("Local database and session secret are required");

  const marker = randomBytes(6).toString("hex");
  const inviterId = randomUUID();
  const inviterEmail = `handover-inviter-${marker}@example.invalid`;
  const newEmail = `handover-owner-${marker}@example.invalid`;
  const expiredEmail = `handover-expired-${marker}@example.invalid`;
  const inviterPassword = `SyntheticInviter-${randomUUID()}-A1`;
  const newPassword = `SyntheticRecipient-${randomUUID()}-B2`;
  const tokens = [
    randomBytes(32).toString("base64url"),
    randomBytes(32).toString("base64url"),
  ];
  const sent: TransactionalEmail[] = [];
  const provider: EmailProvider = {
    async send(message) {
      sent.push(message);
    },
  };
  const emailService = new EmailService(provider, "http://localhost:5173");
  const baseOptions = {
    invitations: postgresAdminInvitationRepository,
    admins: postgresAdminRepository,
    audits: postgresAdminAuditRepository,
    emailService,
    expiryHours: 1,
    allowedEmailDomains: [] as string[],
  };
  const service = new AdminInvitationService({
    ...baseOptions,
    generateToken: () =>
      tokens.shift() ?? randomBytes(32).toString("base64url"),
  });
  // Retain only local test tokens in memory. They are never printed or persisted in raw form.
  let acceptedId: string | null = null;
  try {
    await pool.query(
      `INSERT INTO admins (id,full_name,email,password_hash,role)
       VALUES ($1,'Synthetic Inviting Owner',$2,$3,'SUPER_ADMIN')`,
      [inviterId, inviterEmail, await hashPassword(inviterPassword)],
    );
    const inviterBefore = await pool.query<{
      role: string;
      is_active: boolean;
      password_hash: string;
    }>("SELECT role,is_active,password_hash FROM admins WHERE id=$1", [
      inviterId,
    ]);
    const owner = toSafeAdmin(
      (await postgresAdminRepository.findById(inviterId))!,
    );

    for (const role of [
      "ADMIN",
      "FINANCE",
      "REGISTRATION_MANAGER",
      "COMMUNICATIONS",
    ] as const) {
      await assert.rejects(
        service.create(
          { ...owner, role, permissions: getPermissionsForRole(role) },
          { name: "Synthetic New Owner", email: newEmail, role: "SUPER_ADMIN" },
        ),
        InvitationSuperAdminPermissionError,
      );
    }
    const denied = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM admin_invitations WHERE email=$1",
      [newEmail],
    );
    assert.equal(denied.rows[0]?.count, 0);

    const created = await service.create(owner, {
      name: "Synthetic New Owner",
      email: newEmail,
      role: "SUPER_ADMIN",
    });
    assert.equal(created.emailSent, true);
    assert.equal(created.invitation.role, "SUPER_ADMIN");
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.toEmail, newEmail);
    assert.equal(JSON.stringify(created).includes("tokenHash"), false);
    const invitationAudit = await pool.query<{
      admin_id: string;
      metadata: { email?: string; role?: string };
    }>(
      `SELECT admin_id,metadata FROM admin_audit_logs
       WHERE action='USER_INVITED' AND entity_type='ADMIN_INVITATION' AND entity_id=$1`,
      [created.invitation.id],
    );
    assert.equal(invitationAudit.rows.length, 1);
    assert.equal(invitationAudit.rows[0]?.admin_id, inviterId);
    assert.deepEqual(invitationAudit.rows[0]?.metadata, {
      role: "SUPER_ADMIN",
      email: newEmail,
    });
    assert.equal(
      JSON.stringify(invitationAudit.rows).includes(sent[0]!.text),
      false,
    );

    const invitationUrl = sent[0]!.text.match(/https?:\/\/\S+/)?.[0];
    assert.ok(invitationUrl);
    const token = new URL(invitationUrl).searchParams.get("token");
    assert.ok(token);
    assert.equal((await service.validate(token)).status, "VALID");
    const accepted = await service.accept({
      token,
      password: newPassword,
      confirmPassword: newPassword,
    });
    assert.equal(accepted.status, "ACCEPTED");
    if (accepted.status !== "ACCEPTED")
      throw new Error("Synthetic owner was not accepted");
    acceptedId = accepted.admin.id;
    assert.notEqual(acceptedId, inviterId);
    assert.equal(accepted.admin.role, "SUPER_ADMIN");
    const newOwner = await postgresAdminRepository.findByEmail(newEmail);
    assert.equal(newOwner?.isActive, true);
    assert.equal(newOwner?.role, "SUPER_ADMIN");
    assert.notEqual(
      newOwner?.passwordHash,
      inviterBefore.rows[0]?.password_hash,
    );
    assert.equal((await service.validate(token)).status, "USED");
    assert.equal(
      (
        await service.accept({
          token,
          password: newPassword,
          confirmPassword: newPassword,
        })
      ).status,
      "USED",
    );
    const invalidToken = randomBytes(32).toString("base64url");
    assert.equal((await service.validate(invalidToken)).status, "INVALID");
    assert.equal(
      (
        await service.accept({
          token: invalidToken,
          password: newPassword,
          confirmPassword: newPassword,
        })
      ).status,
      "INVALID",
    );

    const expiredCreated = await service.create(owner, {
      name: "Synthetic Expired Owner",
      email: expiredEmail,
      role: "SUPER_ADMIN",
    });
    assert.equal(expiredCreated.emailSent, true);
    const expiredUrl = sent[1]!.text.match(/https?:\/\/\S+/)?.[0];
    assert.ok(expiredUrl);
    const expiredToken = new URL(expiredUrl).searchParams.get("token");
    assert.ok(expiredToken);
    const expiredService = new AdminInvitationService({
      ...baseOptions,
      now: () => new Date(Date.now() + 2 * 60 * 60_000),
    });
    assert.equal(
      (
        await expiredService.accept({
          token: expiredToken,
          password: newPassword,
          confirmPassword: newPassword,
        })
      ).status,
      "EXPIRED",
    );
    assert.equal(await postgresAdminRepository.findByEmail(expiredEmail), null);

    const auth = new AuthService(postgresAdminRepository);
    assert.equal(
      (await auth.authenticate(inviterEmail, inviterPassword))?.id,
      inviterId,
    );
    assert.equal(
      (await auth.authenticate(newEmail, newPassword))?.id,
      acceptedId,
    );
    assert.equal(await auth.authenticate(inviterEmail, newPassword), null);
    assert.equal(await auth.authenticate(newEmail, inviterPassword), null);
    const app = createConfiguredApplication();
    const inviterAgent = request.agent(app);
    const recipientAgent = request.agent(app);
    const inviterLogin = await inviterAgent
      .post("/api/auth/login")
      .send({ email: inviterEmail, password: inviterPassword })
      .expect(200);
    const recipientLogin = await recipientAgent
      .post("/api/auth/login")
      .send({ email: newEmail, password: newPassword })
      .expect(200);
    assert.notEqual(
      inviterLogin.headers["set-cookie"]?.[0],
      recipientLogin.headers["set-cookie"]?.[0],
    );
    assert.equal(
      (await inviterAgent.get("/api/auth/me").expect(200)).body.data.admin.id,
      inviterId,
    );
    assert.equal(
      (await recipientAgent.get("/api/auth/me").expect(200)).body.data.admin.id,
      acceptedId,
    );
    await inviterAgent.post("/api/auth/logout").expect(200);
    assert.equal(
      (await recipientAgent.get("/api/auth/me").expect(200)).body.data.admin.id,
      acceptedId,
    );

    const inviterAfter = await pool.query<{
      role: string;
      is_active: boolean;
      password_hash: string;
    }>("SELECT role,is_active,password_hash FROM admins WHERE id=$1", [
      inviterId,
    ]);
    assert.deepEqual(inviterAfter.rows[0], inviterBefore.rows[0]);
    const acceptanceAudit = await pool.query<{ admin_id: string }>(
      `SELECT admin_id FROM admin_audit_logs
       WHERE action='INVITATION_ACCEPTED' AND entity_type='ADMIN_INVITATION' AND entity_id=$1`,
      [created.invitation.id],
    );
    assert.equal(acceptanceAudit.rows[0]?.admin_id, acceptedId);
    console.log(
      "Super Admin PostgreSQL acceptance PASS: role gate, separate active owner, independent credentials/sessions, expiry/reuse/invalid denial, unchanged inviter, attributed audit; recording email provider only",
    );
  } finally {
    const syntheticIds = [inviterId, ...(acceptedId ? [acceptedId] : [])];
    await pool.query(
      "DELETE FROM session WHERE sess->>'adminId'=ANY($1::text[])",
      [syntheticIds],
    );
    await pool.query(
      "DELETE FROM admin_audit_logs WHERE admin_id=ANY($1::uuid[])",
      [syntheticIds],
    );
    await pool.query(
      "DELETE FROM admin_invitations WHERE email=ANY($1::text[])",
      [[newEmail, expiredEmail]],
    );
    if (acceptedId)
      await pool.query("DELETE FROM admins WHERE id=$1", [acceptedId]);
    await pool.query("DELETE FROM admins WHERE id=$1", [inviterId]);
    await closeDatabasePool();
  }
}

void main().catch((error) => {
  console.error(
    "Super Admin invitation acceptance failed",
    error instanceof Error ? error.message : "unknown",
  );
  process.exitCode = 1;
});
