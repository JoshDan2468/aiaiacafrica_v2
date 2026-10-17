import assert from "node:assert/strict";
import test from "node:test";
import type { RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { getPermissionsForRole } from "../src/config/permissions";
import { createAdminMutationSecurity } from "../src/middleware/adminMutationSecurity.middleware";
import type { ContactRepository } from "../src/repositories/contact.repository";
import { createCommunicationRouter } from "../src/routes/communication.routes";
import { createApiRouter } from "../src/routes";
import { ContactService } from "../src/services/contact.service";
import { ContactCsvError, parseContactCsv } from "../src/services/contactCsv";
import type { AdminRole } from "../src/types/admin";
import type { CommunicationService } from "../src/services/communication.service";
import {
  contactListSchema,
  manualContactSchema,
} from "../src/validators/contact.validator";

test("contact validation normalizes email and rejects malformed or unsafe fields", () => {
  assert.equal(
    manualContactSchema.parse({ name: " Ada ", email: " ADA@EXAMPLE.COM " })
      .email,
    "ada@example.com",
  );
  assert.equal(
    manualContactSchema.safeParse({ name: "A\nB", email: "a@example.com" })
      .success,
    false,
  );
  assert.equal(
    manualContactSchema.safeParse({ name: "Ada", email: "bad" }).success,
    false,
  );
  assert.equal(
    manualContactSchema.safeParse({
      name: "Ada",
      email: "a@example.com",
      paymentStatus: "PAID",
    }).success,
    false,
  );
  assert.equal(
    contactListSchema.parse({ type: "", source: "" }).type,
    undefined,
  );
  assert.equal(
    contactListSchema.safeParse({ source: "PAYMENT" }).success,
    false,
  );
});

test("CSV parser handles quotes and bounds, rejects malformed headers and rows", () => {
  const parsed = parseContactCsv(
    'name,email,company,country\r\n"Doe, Jane", JANE@EXAMPLE.COM ,"Acme, Ltd",Nigeria\r\nBad,bad@example.com',
  );
  assert.equal(parsed[0]?.value?.name, "Doe, Jane");
  assert.equal(parsed[0]?.value?.organization, "Acme, Ltd");
  assert.equal(parsed[1]?.value, null);
  assert.throws(
    () => parseContactCsv('name,email\n"Unclosed,a@example.com'),
    ContactCsvError,
  );
  assert.throws(
    () => parseContactCsv("name,name,email\nA,A,a@example.com"),
    ContactCsvError,
  );
  assert.throws(
    () => parseContactCsv(`name,email\n${"A,a@example.com\n".repeat(501)}`),
    ContactCsvError,
  );
  assert.throws(
    () => parseContactCsv(`name,email\n${"a".repeat(76 * 1024)}`),
    ContactCsvError,
  );
});

test("manual and import contacts deduplicate without creating business records", async () => {
  const stored = new Set(["registered@example.com"]);
  const inserted: string[] = [];
  const repository: ContactRepository = {
    async list() {
      return { items: [], total: 0 };
    },
    async existingEmails(emails) {
      return new Set(emails.filter((email) => stored.has(email)));
    },
    async insertManual(input) {
      inserted.push(input.email);
      stored.add(input.email);
      return {
        id: "manual:1",
        name: input.name,
        email: input.email,
        organization: null,
        country: null,
        status: "ACTIVE",
        createdAt: new Date(),
        source: "MANUAL",
        types: ["GENERAL_CONTACT"],
      };
    },
    async insertImported(inputs) {
      for (const input of inputs) {
        inserted.push(input.email);
        stored.add(input.email);
      }
      return new Set(inputs.map((input) => input.email));
    },
  };
  const service = new ContactService(repository);
  await assert.rejects(
    service.add(
      { name: "Registered", email: " REGISTERED@example.com " },
      "admin",
    ),
    /already exists/,
  );
  const summary = await service.importCsv(
    "name,email\nExisting,registered@example.com\nAda,ADA@example.com\nDuplicate,ada@example.com\nBroken,not-an-email\nBob,bob@example.com",
    "admin",
  );
  assert.deepEqual(
    {
      imported: summary.imported,
      skipped: summary.skipped,
      invalid: summary.invalid,
    },
    { imported: 2, skipped: 2, invalid: 1 },
  );
  assert.deepEqual(inserted, ["ada@example.com", "bob@example.com"]);
  assert.equal((await service.list({ page: 2, limit: 25 })).page, 2);
});

test("contacts routes enforce authentication, Communications RBAC and CSRF", async () => {
  const auth: RequestHandler = (req, res, next) => {
    const role = req.get("X-Test-Role") as AdminRole | undefined;
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    res.locals.admin = {
      id: "admin-id",
      role,
      permissions: getPermissionsForRole(role),
    };
    next();
  };
  const repository: ContactRepository = {
    async list() {
      return { items: [], total: 0 };
    },
    async existingEmails() {
      return new Set();
    },
    async insertManual(input) {
      return {
        id: "manual:1",
        name: input.name,
        email: input.email,
        organization: null,
        country: null,
        status: "ACTIVE",
        createdAt: new Date(),
        source: "MANUAL",
        types: ["GENERAL_CONTACT"],
      };
    },
    async insertImported(inputs) {
      return new Set(inputs.map((item) => item.email));
    },
  };
  const router = createCommunicationRouter({
    requireAuth: auth,
    mutationSecurity: createAdminMutationSecurity(["http://localhost:5173"]),
    service: {} as CommunicationService,
    contactService: new ContactService(repository),
  });
  const app = createApplication({
    apiRouter: createApiRouter({ communicationRouter: router }),
  });
  const url = "/api/admin/communications/contacts";
  assert.equal((await request(app).get(url)).status, 401);
  assert.equal(
    (await request(app).get(url).set("X-Test-Role", "FINANCE")).status,
    403,
  );
  for (const role of ["SUPER_ADMIN", "ADMIN", "COMMUNICATIONS"] as const) {
    const response = await request(app).get(url).set("X-Test-Role", role);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, {
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
  }
  assert.equal(
    (
      await request(app)
        .post(url)
        .set("X-Test-Role", "COMMUNICATIONS")
        .send({ name: "Ada", email: "ada@example.com" })
    ).status,
    403,
  );
  const headers = {
    "X-Test-Role": "COMMUNICATIONS",
    "X-AIAIAC-CSRF": "1",
    Origin: "http://localhost:5173",
  };
  assert.equal(
    (
      await request(app)
        .post(url)
        .set(headers)
        .send({ name: "Ada", email: "ada@example.com" })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post(`${url}/import`)
        .set(headers)
        .send({ csv: "name,email\nAda,ada@example.com" })
    ).body.data.imported,
    1,
  );
  assert.equal(
    (
      await request(app)
        .post(`${url}/import`)
        .set(headers)
        .send({ csv: "bad header" })
    ).status,
    400,
  );
});
