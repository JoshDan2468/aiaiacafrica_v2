import assert from "node:assert/strict";
import test from "node:test";
import express, { Router } from "express";
import session from "express-session";
import request from "supertest";
import { createApplication } from "../src/app";
import { authCookieName } from "../src/config/session";
import { getAuthCookieOptions } from "../src/config/session";
import type {
  AdminAuditRepository,
  CreateAuditLogInput,
} from "../src/repositories/adminAudit.repository";
import { createAuthController } from "../src/controllers/auth.controller";
import { createLoginRateLimiter } from "../src/middleware/loginRateLimit.middleware";
import { createRequireAuth } from "../src/middleware/requireAuth.middleware";
import {
  DuplicateAdminEmailError,
  type AdminAuthRepository,
  type CreateAdminInput,
} from "../src/repositories/admin.repository";
import { createAdminRouter } from "../src/routes/admin.routes";
import { createAuthRouter } from "../src/routes/auth.routes";
import { createApiRouter } from "../src/routes";
import {
  AuthService,
  type PasswordOperations,
} from "../src/services/auth.service";
import { hashPassword, verifyPassword } from "../src/services/password.service";
import type { AdminRecord, AdminRole } from "../src/types/admin";
import { initialSuperAdminSchema } from "../src/validators/auth.validator";

const testSessionSecret = "test-only-session-secret-that-is-long-enough";

function adminRecord(
  id: string,
  email: string,
  role: AdminRole,
  password = "CorrectPassword1",
): AdminRecord {
  return {
    id,
    fullName: role === "SUPER_ADMIN" ? "Super Admin" : "Regular Admin",
    email,
    passwordHash: `hash:${password}`,
    role,
    isActive: true,
    lastLoginAt: null,
  };
}

class FakeAdminRepository implements AdminAuthRepository {
  readonly records = new Map<string, AdminRecord>();
  readonly lastLoginUpdates: Array<{ id: string; loggedInAt: Date }> = [];
  createdInput: CreateAdminInput | null = null;
  rejectDuplicate = false;

  constructor(records: readonly AdminRecord[] = []) {
    for (const record of records) this.records.set(record.id, record);
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

  async updateLastLogin(id: string, loggedInAt: Date): Promise<void> {
    this.lastLoginUpdates.push({ id, loggedInAt });
  }

  async create(input: CreateAdminInput): Promise<AdminRecord> {
    if (this.rejectDuplicate) throw new DuplicateAdminEmailError();
    this.createdInput = input;
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
}

const fakePasswords: PasswordOperations = {
  async hash(password) {
    return `hash:${password}`;
  },
  async verify(passwordHash, password) {
    return passwordHash === `hash:${password}`;
  },
  dummyHash: Promise.resolve("hash:not-the-password"),
};

interface TestAuthApplication {
  readonly app: express.Express;
  readonly admins: FakeAdminRepository;
  readonly auditEvents: CreateAuditLogInput[];
}

function createTestAuthApplication(
  records: readonly AdminRecord[] = [],
  rateLimitMax = 100,
  policy: { idleMs: number; absoluteMs: number; now?: () => number } = {
    idleMs: 30 * 60_000,
    absoluteMs: 12 * 3_600_000,
  },
): TestAuthApplication {
  const admins = new FakeAdminRepository(records);
  const auditEvents: CreateAuditLogInput[] = [];
  const audits: AdminAuditRepository = {
    async create(input) {
      auditEvents.push(input);
    },
  };
  const authService = new AuthService(admins, fakePasswords);
  const requireAuth = createRequireAuth(authService, policy, audits, false);
  const controller = createAuthController({
    authService,
    audits,
    sessionPolicy: policy,
    production: false,
  });
  const authRouter = Router();
  authRouter.post("/seed-session", (req, res) => {
    req.session.adminId = "old-session-admin";
    res.status(204).end();
  });
  authRouter.use(
    createAuthRouter({
      controller,
      requireAuth,
      loginRateLimiter: createLoginRateLimiter({
        windowMs: 60_000,
        max: rateLimitMax,
      }),
    }),
  );

  const app = createApplication({
    sessionMiddleware: session({
      name: authCookieName,
      secret: testSessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax", maxAge: policy.absoluteMs },
    }),
    apiRouter: createApiRouter({
      checkDatabaseConnection: async () => undefined,
      authRouter,
      adminRouter: createAdminRouter(requireAuth),
    }),
  });

  return { app, admins, auditEvents };
}

function assertSafeAdminResponse(body: unknown): void {
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("passwordHash"), false);
  assert.equal(serialized.includes("password_hash"), false);
  assert.equal(serialized.includes("session"), false);
}

test("initial Super Admin creation normalizes email and stores only a password hash", async () => {
  const admins = new FakeAdminRepository();
  const service = new AuthService(admins, fakePasswords);
  const input = initialSuperAdminSchema.parse({
    fullName: "  Conference   Owner ",
    email: " OWNER@Example.COM ",
    password: "StrongPassword1",
  });

  const result = await service.createInitialSuperAdmin(input);

  assert.equal(result.fullName, "Conference Owner");
  assert.equal(result.email, "owner@example.com");
  assert.equal(result.role, "SUPER_ADMIN");
  assert.equal(admins.createdInput?.passwordHash, "hash:StrongPassword1");
  assert.notEqual(admins.createdInput?.passwordHash, input.password);
  assertSafeAdminResponse(result);
});

test("Argon2id hashes passwords and verifies without storing plaintext", async () => {
  const password = "StrongPassword1";
  const passwordHash = await hashPassword(password);
  assert.match(passwordHash, /^\$argon2id\$/);
  assert.notEqual(passwordHash, password);
  assert.equal(await verifyPassword(passwordHash, password), true);
  assert.equal(await verifyPassword(passwordHash, "WrongPassword1"), false);
});

test("duplicate initial Super Admin creation is safely rejected", async () => {
  const admins = new FakeAdminRepository();
  admins.rejectDuplicate = true;
  const service = new AuthService(admins, fakePasswords);

  await assert.rejects(
    service.createInitialSuperAdmin({
      fullName: "Conference Owner",
      email: "owner@example.com",
      password: "StrongPassword1",
    }),
    DuplicateAdminEmailError,
  );
});

test("there is no public admin registration endpoint", async () => {
  const { app } = createTestAuthApplication();
  await request(app).post("/api/auth/register").send({}).expect(404);
});

test("active Admin login is normalized, regenerates the session, and updates last login", async () => {
  const record = adminRecord("admin-1", "admin@example.com", "ADMIN");
  const { app, admins } = createTestAuthApplication([record]);
  const agent = request.agent(app);

  const seeded = await agent.post("/api/auth/seed-session").expect(204);
  const oldCookie = seeded.headers["set-cookie"]?.[0];
  assert.ok(oldCookie);

  const response = await agent
    .post("/api/auth/login")
    .send({ email: " ADMIN@EXAMPLE.COM ", password: "CorrectPassword1" })
    .expect(200);

  assert.equal(response.body.message, "Login successful");
  assert.equal(response.body.data.admin.email, "admin@example.com");
  assertSafeAdminResponse(response.body);
  assert.equal(admins.lastLoginUpdates.length, 1);
  assert.equal(admins.lastLoginUpdates[0]?.id, "admin-1");
  assert.ok(admins.lastLoginUpdates[0]?.loggedInAt instanceof Date);
  const newCookie = response.headers["set-cookie"]?.[0];
  assert.ok(newCookie);
  assert.notEqual(newCookie.split(";")[0], oldCookie.split(";")[0]);
  await request(app)
    .get("/api/admin/test")
    .set("Cookie", oldCookie)
    .expect(401);
  assert.match(newCookie, /HttpOnly/i);
  assert.match(newCookie, /SameSite=Lax/i);
});

test("wrong password, unknown email, and disabled Admin use the same generic 401", async () => {
  const active = adminRecord("admin-1", "admin@example.com", "ADMIN");
  const disabled = {
    ...adminRecord("admin-2", "disabled@example.com", "ADMIN"),
    isActive: false,
  };
  const { app } = createTestAuthApplication([active, disabled]);

  for (const credentials of [
    { email: "admin@example.com", password: "WrongPassword1" },
    { email: "unknown@example.com", password: "WrongPassword1" },
    { email: "disabled@example.com", password: "CorrectPassword1" },
  ]) {
    const response = await request(app)
      .post("/api/auth/login")
      .send(credentials)
      .expect(401);
    assert.deepEqual(response.body, {
      success: false,
      message: "Invalid email or password",
    });
  }
});

test("login validation is strict and bounded", async () => {
  const { app } = createTestAuthApplication();
  for (const body of [
    { email: "not-an-email", password: "value" },
    { email: "admin@example.com", password: "" },
    { email: "admin@example.com", password: "x".repeat(129) },
    { email: "admin@example.com", password: "value", unexpected: true },
  ]) {
    const response = await request(app)
      .post("/api/auth/login")
      .send(body)
      .expect(400);
    assert.equal(response.body.message, "Invalid login request");
  }
});

test("current Admin requires a session and returns a safe database-backed profile", async () => {
  const record = adminRecord("super-1", "owner@example.com", "SUPER_ADMIN");
  const { app } = createTestAuthApplication([record]);
  const agent = request.agent(app);

  await request(app).get("/api/auth/me").expect(401);
  await agent
    .post("/api/auth/login")
    .send({ email: record.email, password: "CorrectPassword1" })
    .expect(200);
  const response = await agent.get("/api/auth/me").expect(200);
  assert.equal(response.body.data.admin.id, "super-1");
  assert.ok(Date.parse(response.body.data.inactivityExpiresAt));
  assert.ok(Date.parse(response.body.data.absoluteExpiresAt));
  assertSafeAdminResponse(response.body);
});

test("authenticated activity slides idle expiry without extending the absolute lifetime", async () => {
  const record = adminRecord("admin-clock", "clock@example.com", "ADMIN");
  let clock = Date.now();
  const startedAt = clock;
  const { app, auditEvents } = createTestAuthApplication([record], 100, {
    idleMs: 30 * 60_000,
    absoluteMs: 12 * 3_600_000,
    now: () => clock,
  });
  const agent = request.agent(app);
  const login = await agent
    .post("/api/auth/login")
    .send({ email: record.email, password: "CorrectPassword1" })
    .expect(200);
  assert.equal(
    Date.parse(login.body.data.absoluteExpiresAt),
    startedAt + 12 * 3_600_000,
  );
  assert.equal(
    Date.parse(login.body.data.inactivityExpiresAt),
    startedAt + 30 * 60_000,
  );

  clock += 25 * 60_000;
  const active = await agent.get("/api/auth/me").expect(200);
  assert.equal(
    Date.parse(active.body.data.inactivityExpiresAt),
    clock + 30 * 60_000,
  );
  assert.equal(
    Date.parse(active.body.data.absoluteExpiresAt),
    startedAt + 12 * 3_600_000,
  );
  clock += 29 * 60_000;
  await agent.get("/api/admin/test").expect(200);
  assert.equal(
    auditEvents.filter((event) => event.action === "ADMIN_LOGIN").length,
    1,
  );
  assert.equal(
    auditEvents.filter((event) => event.action === "ADMIN_SESSION_EXPIRED")
      .length,
    0,
  );

  clock = startedAt + 12 * 3_600_000;
  const expired = await agent.get("/api/auth/me").expect(401);
  assert.equal(expired.body.message, "Authentication required");
  assert.equal(auditEvents.at(-1)?.action, "ADMIN_SESSION_EXPIRED");
  assert.deepEqual(auditEvents.at(-1)?.metadata, { reason: "ABSOLUTE" });
  assert.equal(JSON.stringify(auditEvents).includes(authCookieName), false);
  await agent.get("/api/admin/test").expect(401);
});

test("inactivity expiration revokes the session and audits without credential material", async () => {
  const record = adminRecord("admin-idle", "idle@example.com", "FINANCE");
  let clock = Date.now();
  const { app, auditEvents } = createTestAuthApplication([record], 100, {
    idleMs: 2 * 60_000,
    absoluteMs: 12 * 3_600_000,
    now: () => clock,
  });
  const agent = request.agent(app);
  const login = await agent
    .post("/api/auth/login")
    .send({ email: record.email, password: "CorrectPassword1" })
    .expect(200);
  const cookie = login.headers["set-cookie"]?.[0] as string;
  clock += 2 * 60_000;
  await agent.get("/api/auth/me").expect(401);
  await request(app).get("/api/admin/test").set("Cookie", cookie).expect(401);
  assert.equal(
    auditEvents.filter((event) => event.action === "ADMIN_SESSION_EXPIRED")
      .length,
    1,
  );
  assert.deepEqual(auditEvents.at(-1)?.metadata, { reason: "INACTIVITY" });
  assert.equal(
    JSON.stringify(auditEvents).includes(cookie.split(";")[0]!),
    false,
  );
  assert.equal(JSON.stringify(auditEvents).includes("CorrectPassword1"), false);
});

test("continuous activity cannot cross the fixed absolute deadline", async () => {
  const record = adminRecord("admin-absolute", "absolute@example.com", "ADMIN");
  let clock = Date.now();
  const startedAt = clock;
  const { app } = createTestAuthApplication([record], 100, {
    idleMs: 30 * 60_000,
    absoluteMs: 60 * 60_000,
    now: () => clock,
  });
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: record.email, password: "CorrectPassword1" })
    .expect(200);
  for (const minutes of [20, 40, 59]) {
    clock = startedAt + minutes * 60_000;
    const response = await agent.get("/api/auth/me").expect(200);
    assert.equal(
      Date.parse(response.body.data.absoluteExpiresAt),
      startedAt + 60 * 60_000,
    );
  }
  clock = startedAt + 60 * 60_000;
  await agent.get("/api/admin/test").expect(401);
});

test("role reduction is effective on the next protected request", async () => {
  const record = adminRecord("admin-role", "role@example.com", "SUPER_ADMIN");
  const { app, admins } = createTestAuthApplication([record]);
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: record.email, password: "CorrectPassword1" })
    .expect(200);
  await agent.get("/api/admin/super-admin-test").expect(200);
  admins.records.set(record.id, { ...record, role: "FINANCE" });
  const me = await agent.get("/api/auth/me").expect(200);
  assert.equal(me.body.data.admin.role, "FINANCE");
  await agent.get("/api/admin/super-admin-test").expect(403);
});

test("cookie policy is HttpOnly, SameSite=Lax and Secure only in production", () => {
  assert.deepEqual(getAuthCookieOptions(43_200_000, false), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 43_200_000,
    path: "/",
  });
  assert.equal(getAuthCookieOptions(43_200_000, true).secure, true);
});

test("disabled or deleted Admins with old sessions are rejected", async () => {
  for (const mode of ["disabled", "deleted"] as const) {
    const record = adminRecord(`admin-${mode}`, `${mode}@example.com`, "ADMIN");
    const { app, admins } = createTestAuthApplication([record]);
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: record.email, password: "CorrectPassword1" })
      .expect(200);

    if (mode === "disabled")
      admins.records.set(record.id, { ...record, isActive: false });
    else admins.records.delete(record.id);

    await agent.get("/api/auth/me").expect(401);
    await agent.get("/api/admin/test").expect(401);
  }
});

test("logout clears the cookie, destroys the session, and is safe without login", async () => {
  const record = adminRecord("admin-1", "admin@example.com", "ADMIN");
  const { app, auditEvents } = createTestAuthApplication([record]);
  const agent = request.agent(app);

  await request(app).post("/api/auth/logout").expect(200);
  const login = await agent
    .post("/api/auth/login")
    .send({ email: record.email, password: "CorrectPassword1" })
    .expect(200);
  const oldCookie = login.headers["set-cookie"]?.[0] as string;
  await agent.get("/api/admin/test").expect(200);
  const logout = await agent.post("/api/auth/logout").expect(200);
  assert.match(
    logout.headers["set-cookie"]?.[0] ?? "",
    /Expires=Thu, 01 Jan 1970/i,
  );
  await agent.get("/api/auth/me").expect(401);
  await agent.get("/api/admin/test").expect(401);
  await request(app)
    .get("/api/admin/test")
    .set("Cookie", oldCookie)
    .expect(401);
  assert.equal(
    auditEvents.filter((event) => event.action === "ADMIN_LOGOUT").length,
    1,
  );
});

test("ADMIN and SUPER_ADMIN authorization is enforced independently", async () => {
  const regular = adminRecord("admin-1", "admin@example.com", "ADMIN");
  const superAdmin = adminRecord("super-1", "owner@example.com", "SUPER_ADMIN");
  const { app } = createTestAuthApplication([regular, superAdmin]);

  await request(app).get("/api/admin/test").expect(401);
  await request(app).get("/api/admin/super-admin-test").expect(401);

  const adminAgent = request.agent(app);
  await adminAgent
    .post("/api/auth/login")
    .send({ email: regular.email, password: "CorrectPassword1" })
    .expect(200);
  await adminAgent.get("/api/admin/test").expect(200);
  await adminAgent.get("/api/admin/super-admin-test").expect(403);

  const superAgent = request.agent(app);
  await superAgent
    .post("/api/auth/login")
    .send({ email: superAdmin.email, password: "CorrectPassword1" })
    .expect(200);
  await superAgent.get("/api/admin/test").expect(200);
  await superAgent.get("/api/admin/super-admin-test").expect(200);
});

test("login failures are rate-limited without blocking health", async () => {
  const { app } = createTestAuthApplication([], 1);
  const credentials = {
    email: "unknown@example.com",
    password: "WrongPassword1",
  };

  await request(app).post("/api/auth/login").send(credentials).expect(401);
  const limited = await request(app)
    .post("/api/auth/login")
    .send(credentials)
    .expect(429);
  assert.equal(
    limited.body.message,
    "Too many login attempts. Please try again later",
  );
  await request(app).get("/api/health").expect(200);
});

test("credentialed CORS allows only the configured origin and handles preflight", async () => {
  const { app } = createTestAuthApplication();
  const preflight = await request(app)
    .options("/api/auth/login")
    .set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "POST")
    .expect(204);
  assert.equal(
    preflight.headers["access-control-allow-origin"],
    "http://localhost:5173",
  );
  assert.equal(preflight.headers["access-control-allow-credentials"], "true");

  await request(app)
    .post("/api/auth/login")
    .set("Origin", "https://untrusted.example")
    .send({ email: "admin@example.com", password: "value" })
    .expect(403);
});

test("cross-site cookie policy requires Secure even outside production", () => {
  const cookie = getAuthCookieOptions(43_200_000, false, "none");
  assert.equal(cookie.sameSite, "none");
  assert.equal(cookie.secure, true);
  assert.equal(cookie.httpOnly, true);
});
