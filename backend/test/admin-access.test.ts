import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { RequestHandler } from "express";
import type { PoolClient } from "pg";
import request from "supertest";
import { createApplication } from "../src/app";
import {
  getPermissionsForRole,
  roleHasPermission,
} from "../src/config/permissions";
import { createAdminUserController } from "../src/controllers/adminUser.controller";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { createAdminMutationSecurity } from "../src/middleware/adminMutationSecurity.middleware";
import { createPublicError } from "../src/middleware/error.middleware";
import type {
  AdminAuditRepository,
  CreateAuditLogInput,
} from "../src/repositories/adminAudit.repository";
import type {
  AdminInvitationRepository,
  CreateAdminInvitationInput,
} from "../src/repositories/adminInvitation.repository";
import type {
  AdminRepository,
  CreateAdminInput,
} from "../src/repositories/admin.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createApiRouter } from "../src/routes";
import { AdminInvitationService } from "../src/services/adminInvitation.service";
import { InvitationSuperAdminPermissionError } from "../src/services/adminInvitation.service";
import {
  AdminUserProtectedError,
  AdminUserInactiveError,
  AdminUserPromotionPermissionError,
  AdminUserSelfChangeError,
  AdminUserService,
} from "../src/services/adminUser.service";
import type {
  AdminInvitationRecord,
  AdminRecord,
  AdminRole,
  AdminUser,
  SafeAdmin,
} from "../src/types/admin";
import type {
  DatabaseExecutor,
  TransactionRunner,
} from "../src/types/database";
import { createAdminInvitationSchema } from "../src/validators/adminUser.validator";

const fixedNow = new Date("2026-09-14T12:00:00.000Z");
const tokenOne = "A".repeat(43);
const tokenTwo = "B".repeat(43);
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function safeAdmin(
  role: AdminRole = "SUPER_ADMIN",
  id = "10000000-0000-4000-8000-000000000001",
): SafeAdmin {
  return {
    id,
    fullName: "Test Administrator",
    email: "owner@example.com",
    role,
    permissions: getPermissionsForRole(role),
  };
}

class FakeEmailProvider implements EmailProvider {
  readonly messages: TransactionalEmail[] = [];
  fail = false;

  async send(message: TransactionalEmail): Promise<void> {
    if (this.fail) throw new Error("provider secret failure");
    this.messages.push(message);
  }
}

class FakeAuditRepository implements AdminAuditRepository {
  readonly entries: CreateAuditLogInput[] = [];
  fail = false;

  async create(input: CreateAuditLogInput): Promise<void> {
    if (this.fail) throw new Error("audit failed");
    this.entries.push(input);
  }
}

class FakeAdminRepository implements AdminRepository {
  readonly records = new Map<string, AdminRecord>();
  readonly createdInputs: CreateAdminInput[] = [];

  constructor(records: AdminRecord[] = []) {
    records.forEach((record) => this.records.set(record.id, record));
  }

  async findByEmail(email: string): Promise<AdminRecord | null> {
    return (
      [...this.records.values()].find((record) => record.email === email) ??
      null
    );
  }

  async findById(id: string): Promise<AdminRecord | null> {
    return this.records.get(id) ?? null;
  }

  async updateLastLogin(): Promise<void> {}

  async create(input: CreateAdminInput): Promise<AdminRecord> {
    this.createdInputs.push(input);
    const record: AdminRecord = {
      id: input.id,
      fullName: input.fullName,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: true,
      lastLoginAt: null,
    };
    this.records.set(record.id, record);
    return record;
  }

  async listUsers(): Promise<AdminUser[]> {
    return [...this.records.values()].map((record) => this.user(record));
  }

  async findUserByIdForUpdate(id: string): Promise<AdminUser | null> {
    const record = this.records.get(id);
    return record ? this.user(record) : null;
  }

  async lockSuperAdminState(): Promise<void> {}

  async countActiveSuperAdmins(): Promise<number> {
    return [...this.records.values()].filter(
      (record) => record.role === "SUPER_ADMIN" && record.isActive,
    ).length;
  }

  async updateActive(
    id: string,
    isActive: boolean,
    _updatedAt: Date,
    _executor: DatabaseExecutor,
  ): Promise<AdminUser> {
    const record = { ...this.records.get(id)!, isActive };
    this.records.set(id, record);
    return this.user(record);
  }

  async updateRole(
    id: string,
    role: AdminRole,
    _updatedAt: Date,
    _executor: DatabaseExecutor,
  ): Promise<AdminUser> {
    const record = { ...this.records.get(id)!, role };
    this.records.set(id, record);
    return this.user(record);
  }

  private user(record: AdminRecord): AdminUser {
    return {
      id: record.id,
      fullName: record.fullName,
      email: record.email,
      role: record.role,
      isActive: record.isActive,
      createdAt: fixedNow,
      lastLoginAt: record.lastLoginAt,
    };
  }
}

class FakeInvitationRepository implements AdminInvitationRepository {
  readonly records = new Map<string, AdminInvitationRecord>();
  createdInput: CreateAdminInvitationInput | null = null;
  lockedEmails: string[] = [];

  async lockEmail(email: string): Promise<void> {
    this.lockedEmails.push(email);
  }

  async findPendingByEmail(
    email: string,
    now: Date,
  ): Promise<AdminInvitationRecord | null> {
    return (
      [...this.records.values()].find(
        (record) =>
          record.email === email &&
          !record.acceptedAt &&
          !record.revokedAt &&
          record.expiresAt > now,
      ) ?? null
    );
  }

  async create(
    input: CreateAdminInvitationInput,
  ): Promise<AdminInvitationRecord> {
    this.createdInput = input;
    const record: AdminInvitationRecord = {
      id: input.id,
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      tokenHash: input.tokenHash,
      invitedByAdminId: input.invitedByAdminId,
      status: "PENDING",
      expiresAt: input.expiresAt,
      acceptedAt: null,
      revokedAt: null,
      emailSentAt: null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    this.records.set(record.id, record);
    return record;
  }

  async list() {
    return [...this.records.values()].map(
      ({ tokenHash: _hash, ...record }) => record,
    );
  }

  async findById(id: string): Promise<AdminInvitationRecord | null> {
    return this.records.get(id) ?? null;
  }

  async findByTokenHash(hash: string): Promise<AdminInvitationRecord | null> {
    return (
      [...this.records.values()].find((record) => record.tokenHash === hash) ??
      null
    );
  }

  async markEmailSent(id: string, sentAt: Date): Promise<void> {
    const record = this.records.get(id)!;
    this.records.set(id, { ...record, emailSentAt: sentAt, updatedAt: sentAt });
  }

  async rotateToken(
    id: string,
    hash: string,
    expiresAt: Date,
    updatedAt: Date,
  ): Promise<AdminInvitationRecord> {
    const record = {
      ...this.records.get(id)!,
      tokenHash: hash,
      expiresAt,
      updatedAt,
      emailSentAt: null,
    };
    this.records.set(id, record);
    return record;
  }

  async revoke(id: string, revokedAt: Date): Promise<AdminInvitationRecord> {
    const record: AdminInvitationRecord = {
      ...this.records.get(id)!,
      status: "REVOKED",
      revokedAt,
      updatedAt: revokedAt,
    };
    this.records.set(id, record);
    return record;
  }

  async markAccepted(id: string, acceptedAt: Date): Promise<void> {
    const record = this.records.get(id)!;
    this.records.set(id, {
      ...record,
      status: "ACCEPTED",
      acceptedAt,
      updatedAt: acceptedAt,
    });
  }
}

function adminRecord(
  id: string,
  role: AdminRole,
  isActive = true,
): AdminRecord {
  return {
    id,
    fullName: `${role} User`,
    email: `${id}@example.com`,
    passwordHash: "hash:ExistingPassword1",
    role,
    isActive,
    lastLoginAt: null,
  };
}

function serviceFixture(
  options: { emailFails?: boolean; tokens?: string[] } = {},
) {
  const invitations = new FakeInvitationRepository();
  const admins = new FakeAdminRepository();
  const audits = new FakeAuditRepository();
  const provider = new FakeEmailProvider();
  provider.fail = options.emailFails ?? false;
  const tokens = options.tokens ?? [tokenOne];
  let tokenIndex = 0;
  const runInTransaction: TransactionRunner = async (work) => {
    const invitationSnapshot = new Map(invitations.records);
    const adminSnapshot = new Map(admins.records);
    const createdInputCount = admins.createdInputs.length;
    const auditCount = audits.entries.length;
    try {
      return await work({} as PoolClient);
    } catch (error) {
      invitations.records.clear();
      invitationSnapshot.forEach((value, key) =>
        invitations.records.set(key, value),
      );
      admins.records.clear();
      adminSnapshot.forEach((value, key) => admins.records.set(key, value));
      admins.createdInputs.splice(createdInputCount);
      audits.entries.splice(auditCount);
      throw error;
    }
  };
  const service = new AdminInvitationService({
    invitations,
    admins,
    audits,
    emailService: new EmailService(provider, "http://localhost:5173"),
    expiryHours: 48,
    allowedEmailDomains: ["example.com"],
    passwords: {
      async hash(password) {
        return `hash:${password}`;
      },
      async verify() {
        return false;
      },
      dummyHash: Promise.resolve("hash:dummy"),
    },
    runInTransaction,
    now: () => fixedNow,
    generateToken: () => tokens[tokenIndex++] ?? tokenTwo,
  });
  return { service, invitations, admins, audits, provider };
}

test("role permissions are centralized and preserve representative boundaries", () => {
  assert.equal(roleHasPermission("SUPER_ADMIN", "users.manage"), true);
  assert.equal(roleHasPermission("FINANCE", "payments.manage"), true);
  assert.equal(roleHasPermission("FINANCE", "users.read"), false);
  assert.equal(
    roleHasPermission("REGISTRATION_MANAGER", "delegates.read"),
    true,
  );
  assert.equal(
    roleHasPermission("REGISTRATION_MANAGER", "users.manage"),
    false,
  );
  assert.equal(roleHasPermission("COMMUNICATIONS", "payments.read"), false);
  assert.equal(
    roleHasPermission("REGISTRATION_MANAGER", "student_verifications.read"),
    true,
  );
  assert.equal(
    roleHasPermission("REGISTRATION_MANAGER", "student_verifications.review"),
    true,
  );
  assert.equal(roleHasPermission("ADMIN", "student_verifications.read"), false);
  assert.equal(
    roleHasPermission("FINANCE", "student_verifications.read"),
    false,
  );
  assert.equal(
    roleHasPermission("COMMUNICATIONS", "student_verifications.read"),
    false,
  );
  assert.equal(roleHasPermission("CHECK_IN_STAFF", "check_in.read"), true);
  assert.equal(roleHasPermission("CHECK_IN_STAFF", "check_in.manage"), true);
  for (const permission of [
    "users.read",
    "users.manage",
    "payments.read",
    "communications.read",
    "student_verifications.read",
    "sponsors.read",
    "accreditations.read",
  ] as const) {
    assert.equal(roleHasPermission("CHECK_IN_STAFF", permission), false);
  }
});

test("CHECK_IN_STAFF invitations create independent named scanner accounts", async () => {
  const { service, admins, audits } = serviceFixture();
  const result = await service.create(safeAdmin(), {
    name: "Scanner One",
    email: "scanner-one@example.com",
    role: "CHECK_IN_STAFF",
  });
  assert.equal(result.invitation.role, "CHECK_IN_STAFF");
  assert.deepEqual(audits.entries[0]?.metadata, {
    role: "CHECK_IN_STAFF",
    email: "scanner-one@example.com",
  });
  const accepted = await service.accept({
    token: tokenOne,
    password: "ScannerPassword1",
    confirmPassword: "ScannerPassword1",
  });
  assert.equal(accepted.status, "ACCEPTED");
  assert.equal(admins.createdInputs[0]?.email, "scanner-one@example.com");
  assert.equal(admins.createdInputs[0]?.role, "CHECK_IN_STAFF");
  assert.equal((await service.validate(tokenOne)).status, "USED");
});

test("invitation creation stores only a hash, sends the raw token, and audits safely", async () => {
  const { service, invitations, audits, provider } = serviceFixture();
  const result = await service.create(safeAdmin(), {
    name: "Jane <Doe> '); DROP TABLE admins; --",
    email: "jane@example.com",
    role: "FINANCE",
  });

  assert.equal(result.emailSent, true);
  assert.equal(invitations.createdInput?.tokenHash, tokenHash(tokenOne));
  assert.equal(
    invitations.createdInput?.fullName,
    "Jane <Doe> '); DROP TABLE admins; --",
  );
  assert.equal(
    JSON.stringify(invitations.createdInput).includes(tokenOne),
    false,
  );
  assert.equal(provider.messages.length, 1);
  assert.match(provider.messages[0]!.text, new RegExp(tokenOne));
  assert.equal(provider.messages[0]!.html.includes("Jane <Doe>"), false);
  assert.equal(audits.entries[0]?.action, "USER_INVITED");
  assert.deepEqual(audits.entries[0]?.metadata, {
    role: "FINANCE",
    email: "jane@example.com",
  });
  assert.equal(JSON.stringify(audits.entries).includes(tokenOne), false);
  assert.equal(JSON.stringify(result).includes("tokenHash"), false);
});

test("invitation validation blocks disallowed domains and unrelated fields", async () => {
  const { service } = serviceFixture();
  await assert.rejects(
    service.create(safeAdmin(), {
      name: "Jane Doe",
      email: "jane@unapproved.test",
      role: "ADMIN",
    }),
  );
  assert.equal(
    createAdminInvitationSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "SUPER_ADMIN",
    }).success,
    true,
  );
  assert.equal(
    createAdminInvitationSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "ADMIN",
      isActive: true,
    }).success,
    false,
  );
});

test("only a SUPER_ADMIN may invite another SUPER_ADMIN and the owner is unchanged", async () => {
  const { service, invitations, admins, audits } = serviceFixture();
  const owner = safeAdmin();
  const originalOwner: AdminRecord = {
    id: owner.id,
    fullName: owner.fullName,
    email: owner.email,
    role: "SUPER_ADMIN",
    passwordHash: "owner-hash",
    isActive: true,
    lastLoginAt: null,
  };
  admins.records.set(owner.id, originalOwner);
  for (const role of [
    "ADMIN",
    "FINANCE",
    "REGISTRATION_MANAGER",
    "COMMUNICATIONS",
  ] as const) {
    await assert.rejects(
      service.create(safeAdmin(role), {
        name: "New Owner",
        email: "new-owner@example.com",
        role: "SUPER_ADMIN",
      }),
      InvitationSuperAdminPermissionError,
    );
  }
  assert.equal(invitations.records.size, 0);
  const created = await service.create(owner, {
    name: "New Owner",
    email: "new-owner@example.com",
    role: "SUPER_ADMIN",
  });
  assert.equal(created.invitation.role, "SUPER_ADMIN");
  assert.deepEqual(audits.entries[0]?.metadata, {
    role: "SUPER_ADMIN",
    email: "new-owner@example.com",
  });
  const accepted = await service.accept({
    token: tokenOne,
    password: "DifferentOwnerPassword1",
    confirmPassword: "DifferentOwnerPassword1",
  });
  assert.equal(accepted.status, "ACCEPTED");
  assert.equal(admins.createdInputs[0]?.role, "SUPER_ADMIN");
  assert.equal(
    admins.createdInputs[0]?.passwordHash,
    "hash:DifferentOwnerPassword1",
  );
  assert.deepEqual(admins.records.get(owner.id), originalOwner);
  assert.equal((await service.validate(tokenOne)).status, "USED");
  assert.equal((await service.validate(tokenTwo)).status, "INVALID");
});

test("valid invitations create the correct account, hash the password, and become single-use", async () => {
  const { service, invitations, admins, audits } = serviceFixture();
  await service.create(safeAdmin(), {
    name: "Jane Doe",
    email: "jane@example.com",
    role: "FINANCE",
  });
  assert.equal((await service.validate(tokenOne)).status, "VALID");

  const accepted = await service.accept({
    token: tokenOne,
    password: "StrongPassword1",
    confirmPassword: "StrongPassword1",
  });
  assert.equal(accepted.status, "ACCEPTED");
  assert.equal(admins.createdInputs[0]?.role, "FINANCE");
  assert.equal(admins.createdInputs[0]?.passwordHash, "hash:StrongPassword1");
  assert.notEqual(admins.createdInputs[0]?.passwordHash, "StrongPassword1");
  assert.equal(audits.entries.at(-1)?.action, "INVITATION_ACCEPTED");
  assert.equal(JSON.stringify(accepted).includes("passwordHash"), false);
  assert.equal(JSON.stringify(accepted).includes("StrongPassword1"), false);
  assert.equal((await service.validate(tokenOne)).status, "USED");
  assert.equal(
    (
      await service.accept({
        token: tokenOne,
        password: "StrongPassword1",
        confirmPassword: "StrongPassword1",
      })
    ).status,
    "USED",
  );
  assert.equal(
    [...invitations.records.values()][0]?.acceptedAt?.toISOString(),
    fixedNow.toISOString(),
  );
});

test("expired and revoked invitations cannot be accepted", async () => {
  const { service, invitations } = serviceFixture();
  await service.create(safeAdmin(), {
    name: "Jane Doe",
    email: "jane@example.com",
    role: "ADMIN",
  });
  const record = [...invitations.records.values()][0]!;
  invitations.records.set(record.id, {
    ...record,
    expiresAt: new Date("2026-09-14T11:59:59.000Z"),
  });
  assert.equal(
    (
      await service.accept({
        token: tokenOne,
        password: "StrongPassword1",
        confirmPassword: "StrongPassword1",
      })
    ).status,
    "EXPIRED",
  );

  invitations.records.set(record.id, {
    ...record,
    expiresAt: new Date("2026-09-15T12:00:00.000Z"),
    revokedAt: fixedNow,
  });
  assert.equal(
    (
      await service.accept({
        token: tokenOne,
        password: "StrongPassword1",
        confirmPassword: "StrongPassword1",
      })
    ).status,
    "REVOKED",
  );
});

test("email failure remains visible and resend invalidates the old token", async () => {
  const fixture = serviceFixture({
    emailFails: true,
    tokens: [tokenOne, tokenTwo],
  });
  const created = await fixture.service.create(safeAdmin(), {
    name: "Jane Doe",
    email: "jane@example.com",
    role: "COMMUNICATIONS",
  });
  assert.equal(created.emailSent, false);
  fixture.provider.fail = false;
  const resent = await fixture.service.resend(
    safeAdmin(),
    created.invitation.id,
  );
  assert.equal(resent.emailSent, true);
  assert.equal((await fixture.service.validate(tokenOne)).status, "INVALID");
  assert.equal((await fixture.service.validate(tokenTwo)).status, "VALID");
  assert.equal(fixture.audits.entries.at(-1)?.action, "INVITATION_RESENT");
});

test("acceptance failure rolls account creation and invitation consumption back together", async () => {
  const fixture = serviceFixture();
  await fixture.service.create(safeAdmin(), {
    name: "Jane Doe",
    email: "jane@example.com",
    role: "ADMIN",
  });
  fixture.audits.fail = true;

  await assert.rejects(
    fixture.service.accept({
      token: tokenOne,
      password: "StrongPassword1",
      confirmPassword: "StrongPassword1",
    }),
  );

  assert.equal(fixture.admins.records.size, 0);
  assert.equal((await fixture.service.validate(tokenOne)).status, "VALID");
});

test("user management audits changes and prevents self/final-Super-Admin damage", async () => {
  const ownerId = "10000000-0000-4000-8000-000000000001";
  const staffId = "20000000-0000-4000-8000-000000000002";
  const admins = new FakeAdminRepository([
    adminRecord(ownerId, "SUPER_ADMIN"),
    adminRecord(staffId, "ADMIN"),
  ]);
  const audits = new FakeAuditRepository();
  const runner: TransactionRunner = async (work) => work({} as PoolClient);
  const users = new AdminUserService(admins, audits, runner, () => fixedNow);

  await users.updateRole(safeAdmin("SUPER_ADMIN", ownerId), staffId, "FINANCE");
  await users.updateStatus(safeAdmin("SUPER_ADMIN", ownerId), staffId, false);
  assert.equal(admins.records.get(staffId)?.role, "FINANCE");
  assert.equal(admins.records.get(staffId)?.isActive, false);
  assert.deepEqual(
    audits.entries.map((entry) => entry.action),
    ["USER_ROLE_CHANGED", "USER_DISABLED"],
  );
  await assert.rejects(
    users.updateStatus(safeAdmin("SUPER_ADMIN", ownerId), ownerId, false),
    AdminUserSelfChangeError,
  );

  const otherActor = safeAdmin(
    "SUPER_ADMIN",
    "30000000-0000-4000-8000-000000000003",
  );
  await assert.rejects(
    users.updateStatus(otherActor, ownerId, false),
    AdminUserProtectedError,
  );
  await assert.rejects(
    users.updateRole(otherActor, ownerId, "ADMIN"),
    AdminUserProtectedError,
  );
});

test("promotion changes only an active existing account and audits actor, target and roles", async () => {
  const ownerId = "10000000-0000-4000-8000-000000000001";
  const staffId = "20000000-0000-4000-8000-000000000002";
  const staff = adminRecord(staffId, "ADMIN");
  const admins = new FakeAdminRepository([
    adminRecord(ownerId, "SUPER_ADMIN"),
    staff,
  ]);
  const audits = new FakeAuditRepository();
  const runner: TransactionRunner = async (work) => work({} as PoolClient);
  const users = new AdminUserService(admins, audits, runner, () => fixedNow);
  for (const role of [
    "ADMIN",
    "FINANCE",
    "REGISTRATION_MANAGER",
    "COMMUNICATIONS",
  ] as const) {
    await assert.rejects(
      users.promoteToSuperAdmin(safeAdmin(role, ownerId), staffId),
      AdminUserPromotionPermissionError,
    );
  }
  assert.equal(admins.records.get(staffId)?.role, "ADMIN");
  const promoted = await users.promoteToSuperAdmin(
    safeAdmin("SUPER_ADMIN", ownerId),
    staffId,
  );
  assert.equal(promoted.id, staffId);
  assert.equal(promoted.role, "SUPER_ADMIN");
  assert.equal(admins.records.size, 2);
  assert.equal(admins.records.get(staffId)?.passwordHash, staff.passwordHash);
  assert.deepEqual(audits.entries[0], {
    adminId: ownerId,
    action: "USER_ROLE_CHANGED",
    entityType: "ADMIN_USER",
    entityId: staffId,
    metadata: {
      targetEmail: staff.email,
      previousRole: "ADMIN",
      role: "SUPER_ADMIN",
    },
    createdAt: fixedNow,
  });
  await assert.rejects(
    users.promoteToSuperAdmin(safeAdmin(), staffId),
    AdminUserProtectedError,
  );
  admins.records.set(staffId, { ...staff, isActive: false });
  await assert.rejects(
    users.promoteToSuperAdmin(safeAdmin(), staffId),
    AdminUserInactiveError,
  );
});

test("user APIs enforce authentication, permission, and mutation security before handlers", async () => {
  const invitations = {
    create: async () => ({ invitation: {}, emailSent: true }),
    list: async () => [],
    revoke: async () => ({}),
    resend: async () => ({ invitation: {}, emailSent: true }),
  } as unknown as AdminInvitationService;
  const users = {
    list: async () => [],
    updateStatus: async () => ({}),
    updateRole: async () => ({}),
    promoteToSuperAdmin: async () => ({}),
  } as unknown as AdminUserService;
  const controller = createAdminUserController({ invitations, users });
  const requireAuth: RequestHandler = (req, res, next) => {
    const role = req.get("x-test-role") as AdminRole | undefined;
    if (!role) return next(createPublicError(401, "Authentication required"));
    res.locals.admin = safeAdmin(role);
    next();
  };
  const app = createApplication({
    clientOrigins: ["http://localhost:5173"],
    apiRouter: createApiRouter({
      adminRouter: createAdminRouter({
        requireAuth,
        mutationSecurity: createAdminMutationSecurity([
          "http://localhost:5173",
        ]),
        adminUserController: controller,
      }),
    }),
  });

  await request(app).get("/api/admin/users").expect(401);
  for (const role of [
    "ADMIN",
    "FINANCE",
    "REGISTRATION_MANAGER",
    "COMMUNICATIONS",
  ]) {
    await request(app)
      .get("/api/admin/users")
      .set("x-test-role", role)
      .expect(403);
  }
  const safeList = await request(app)
    .get("/api/admin/users")
    .set("x-test-role", "SUPER_ADMIN")
    .expect(200);
  assert.equal(JSON.stringify(safeList.body).includes("passwordHash"), false);
  await request(app)
    .post("/api/admin/users/invitations")
    .set("x-test-role", "SUPER_ADMIN")
    .send({ name: "Jane Doe", email: "jane@example.com", role: "ADMIN" })
    .expect(403);
  await request(app)
    .post("/api/admin/users/invitations")
    .set("x-test-role", "FINANCE")
    .set("X-AIAIAC-CSRF", "1")
    .send({ name: "Jane Doe", email: "jane@example.com", role: "ADMIN" })
    .expect(403);
  for (const role of [
    "ADMIN",
    "FINANCE",
    "REGISTRATION_MANAGER",
    "COMMUNICATIONS",
  ]) {
    await request(app)
      .post("/api/admin/users/invitations")
      .set("x-test-role", role)
      .set("X-AIAIAC-CSRF", "1")
      .set("Origin", "http://localhost:5173")
      .send({
        name: "New Owner",
        email: "owner2@example.com",
        role: "SUPER_ADMIN",
      })
      .expect(403);
  }
  await request(app)
    .post("/api/admin/users/invitations")
    .set("x-test-role", "SUPER_ADMIN")
    .set("X-AIAIAC-CSRF", "1")
    .set("Origin", "http://localhost:5173")
    .send({ name: "Jane Doe", email: "jane@example.com", role: "ADMIN" })
    .expect(201);
  await request(app)
    .post("/api/admin/users/invitations")
    .set("x-test-role", "SUPER_ADMIN")
    .set("X-AIAIAC-CSRF", "1")
    .set("Origin", "http://localhost:5173")
    .send({
      name: "New Owner",
      email: "owner2@example.com",
      role: "SUPER_ADMIN",
    })
    .expect(201);
  for (const role of [
    "ADMIN",
    "FINANCE",
    "REGISTRATION_MANAGER",
    "COMMUNICATIONS",
  ] as const) {
    await request(app)
      .patch("/api/admin/users/20000000-0000-4000-8000-000000000002/promote")
      .set("x-test-role", role)
      .set("X-AIAIAC-CSRF", "1")
      .set("Origin", "http://localhost:5173")
      .expect(403);
  }
  await request(app)
    .patch("/api/admin/users/20000000-0000-4000-8000-000000000002/promote")
    .expect(401);
  await request(app)
    .patch("/api/admin/users/20000000-0000-4000-8000-000000000002/promote")
    .set("x-test-role", "SUPER_ADMIN")
    .expect(403);
  await request(app)
    .patch("/api/admin/users/20000000-0000-4000-8000-000000000002/promote")
    .set("x-test-role", "SUPER_ADMIN")
    .set("X-AIAIAC-CSRF", "1")
    .set("Origin", "http://localhost:5173")
    .expect(200);
});
