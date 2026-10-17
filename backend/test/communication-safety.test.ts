import {
  MailjetProvider,
  MailjetDeliveryError,
} from "../src/email/providers/mailjet.provider";
import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import express from "express";
import { createCommunicationPublicRouter } from "../src/routes/communicationPublic.routes";
import { errorHandler } from "../src/middleware/error.middleware";
import {
  UnsubscribeTokens,
  preferenceSchema,
  validateSchedule,
} from "../src/services/communicationSafety";
import { communicationPreferences } from "../src/repositories/communicationPreference.repository";
import {
  audienceSql,
  postgresCommunicationRepository,
} from "../src/repositories/communication.repository";
import { CommunicationService } from "../src/services/communication.service";
import { EmailService } from "../src/email/email.service";
import {
  audienceRequestSchema,
  confirmSchema,
} from "../src/validators/communication.validator";
import { ContactService } from "../src/services/contact.service";
import type { ContactRepository } from "../src/repositories/contact.repository";
import type { CommunicationCampaign } from "../src/types/communication";

const secret = "synthetic-signing-secret-32-characters";
const reference = "AIAIAC-COM-1234ABCD";
test("signed unsubscribe resists tampering and GET scanners; POST suppresses idempotently", async () => {
  const tokens = new UnsubscribeTokens(secret);
  const token = tokens.issue("person@example.com", reference);
  assert.deepEqual(tokens.verify(token), {
    email: "person@example.com",
    campaign: reference,
  });
  assert.throws(() => tokens.verify(token + "tamper"));
  assert.throws(() =>
    new UnsubscribeTokens("wrong-secret-but-long-enough-32chars").verify(token),
  );
  const calls: string[] = [];
  const app = express();
  app.use(express.json());
  app.use(
    createCommunicationPublicRouter({
      secret,
      webhookSecret: secret,
      preferences: {
        async unsubscribe(email: string) {
          calls.push(email);
        },
      } as unknown as typeof communicationPreferences,
    }),
  );
  app.use(errorHandler);
  assert.equal(
    (await request(app).get("/unsubscribe").query({ token })).status,
    200,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (await request(app).post("/unsubscribe").query({ token })).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post("/unsubscribe")
        .query({ token: token + "x" })
    ).status,
    400,
  );
  assert.deepEqual(calls, ["person@example.com"]);
});
test("Mailjet event endpoint authenticates and uses exact UUIDs rather than rounded numeric IDs", async () => {
  const events: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.use(
    createCommunicationPublicRouter({
      secret,
      webhookSecret: secret,
      preferences: {
        async providerEvent(...args: unknown[]) {
          events.push(args);
        },
      } as unknown as typeof communicationPreferences,
    }),
  );
  app.use(errorHandler);
  const uuid = "12345678-1234-4234-8234-123456789abc";
  const body = {
    event: "bounce",
    Message_GUID: uuid,
    MessageID: 13792286917004336,
  };
  assert.equal(
    (await request(app).post("/mailjet/events").send(body)).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .post("/mailjet/events")
        .auth("mailjet", secret)
        .send(body)
    ).status,
    200,
  );
  assert.deepEqual(events, [[uuid, "BOUNCED", undefined]]);
  assert.equal(
    (
      await request(app)
        .post("/mailjet/events")
        .auth("mailjet", secret)
        .send({ event: "arbitrary", Message_GUID: uuid })
    ).status,
    400,
  );
});
test("marketing requires explicit consent, while reminders use verified current unpaid status", () => {
  const marketing = audienceSql({ code: "APPROVED_CONTACTS" });
  assert.match(marketing.sql, /pref.consent='OPTED_IN'/);
  assert.match(marketing.sql, /suppressed/);
  const reminder = audienceSql({
    code: "ALL_DELEGATES",
    purpose: "PAYMENT_REMINDER",
    paymentStatus: "ABANDONED",
  });
  assert.match(reminder.sql, /NOT EXISTS.*paid.status='PAID'/);
  assert.match(reminder.sql, /email_verification_status='VERIFIED'/);
  assert.match(reminder.sql, /pt.status.*ABANDONED/);
  assert.doesNotMatch(reminder.sql, /pref.consent='OPTED_IN'/);
  assert.equal(
    audienceRequestSchema.safeParse({
      code: "SPONSORS",
      purpose: "PAYMENT_REMINDER",
    }).success,
    false,
  );
  assert.equal(
    confirmSchema.safeParse({ fingerprint: "a".repeat(64) }).success,
    false,
  );
  assert.equal(
    preferenceSchema.safeParse({
      email: "person@example.com",
      consent: "OPTED_IN",
    }).success,
    false,
  );
  assert.equal(
    preferenceSchema.safeParse({
      email: "person@example.com",
      suppressed: false,
    }).success,
    false,
  );
  assert.equal(
    preferenceSchema.safeParse({
      email: "person@example.com",
      consent: "OPTED_IN",
      evidence: "Signup consent recorded",
    }).success,
    true,
  );
  assert.throws(() =>
    validateSchedule(new Date(Date.now() - 1000).toISOString()),
  );
  assert.ok(validateSchedule(new Date(Date.now() + 120000).toISOString()));
});
test("CSV tracks consent and source, rejects unproven opt-in and preserves existing contacts", async () => {
  let inserted: readonly import("../src/types/contact").ManualContactInput[] =
    [];
  const service = new ContactService({
    async existingEmails() {
      return new Set(["existing@example.com"]);
    },
    async insertImported(
      rows: readonly import("../src/types/contact").ManualContactInput[],
    ) {
      inserted = rows;
      return new Set(rows.map((row) => row.email));
    },
  } as unknown as ContactRepository);
  const result = await service.importCsv(
    "name,email,consent,consent_evidence,source\nGood,good@example.com,OPTED_IN,Web signup October,Fixture\nDuplicate,GOOD@example.com,OPTED_IN,Web signup October,Fixture\nExisting,existing@example.com,OPTED_IN,Web signup,Fixture\nBad,bad@example.com,OPTED_IN,,Fixture\nUnknown,unknown@example.com,,,Fixture",
    "fixture-admin",
  );
  assert.equal(result.imported, 2);
  assert.equal(result.skipped, 2);
  assert.equal(result.invalid, 1);
  assert.deepEqual(
    inserted.map((row) => [row.email, row.consent, row.sourceLabel]),
    [
      ["good@example.com", "OPTED_IN", "Fixture"],
      ["unknown@example.com", "UNKNOWN", "Fixture"],
    ],
  );
});
test("bulk-disabled scheduler performs no database work and no provider calls", async () => {
  let queried = false;
  let sent = false;
  const service = new CommunicationService(
    {
      async due() {
        queried = true;
        return [];
      },
    } as unknown as typeof postgresCommunicationRepository,
    new EmailService(
      {
        async send() {
          sent = true;
        },
      },
      "https://example.invalid",
    ),
    { async create() {} },
    false,
  );
  await service.runDue();
  assert.equal(queried, false);
  assert.equal(sent, false);
});
test("dispatch skips paid/suppressed recipients and never retries ambiguous provider outcomes", async () => {
  let sent = 0;
  const skipped: unknown[] = [];
  const campaign = {
    id: "id",
    reference,
    status: "SENDING",
    purpose: "PAYMENT_REMINDER",
    title: "Reminder",
    subject: "Reminder",
    preheader: "Complete registration",
    heading: "Registration",
    body: "Complete your registration.",
    audience: { code: "ALL_DELEGATES", paymentStatus: "UNPAID" },
    sent: 0,
    failed: 0,
    pending: 2,
    claimed: 0,
    recipientCount: 2,
  } as CommunicationCampaign;
  const repository = {
    async get() {
      return campaign;
    },
    async claim() {
      return [
        { id: "paid", email: "paid@example.com", name: "Paid" },
        { id: "timeout", email: "timeout@example.com", name: "Timeout" },
      ];
    },
    async isEligible(_campaign: unknown, email: string) {
      return email !== "paid@example.com";
    },
    async resolveSkipped(...args: unknown[]) {
      skipped.push(args);
    },
    async settle() {
      assert.fail("Unknown provider outcome must never be retryable");
    },
    async refreshStatus() {
      return { ...campaign, pending: 0, uncertain: 1, status: "FAILED" };
    },
  } as unknown as typeof postgresCommunicationRepository;
  const service = new CommunicationService(
    repository,
    new EmailService(
      {
        async send() {
          sent++;
          throw new Error("Synthetic timeout");
        },
      },
      "https://example.invalid",
    ),
    { async create() {} },
    true,
  );
  await service.deliver(reference, false, "admin");
  assert.equal(sent, 1);
  assert.deepEqual(skipped, [["paid"], ["timeout", true]]);
});

test("campaign-only Mailjet metadata carries signed one-click headers without altering transactional messages", async () => {
  const payloads: any[] = [];
  const provider = new MailjetProvider({
    apiKey: "fixture",
    secretKey: "fixture",
    fromEmail: "sender@example.invalid",
    fromName: "AIAIAC",
    fetchImplementation: async (_url, options) => {
      payloads.push(JSON.parse(options?.body as string));
      return new Response(
        JSON.stringify({
          Messages: [
            {
              Status: "success",
              To: [
                {
                  Email: "person@example.com",
                  MessageUUID: "12345678-1234-4234-8234-123456789abc",
                  MessageHref:
                    "https://api.mailjet.com/v3/REST/message/13792286917004336",
                },
              ],
            },
          ],
        }),
      );
    },
  });
  const message = {
    toEmail: "person@example.com",
    toName: "Fixture",
    subject: "Fixture",
    html: "<p>Fixture</p>",
    text: "Fixture",
  };
  await provider.send({
    ...message,
    unsubscribeUrl:
      "https://api.example.invalid/api/communications/unsubscribe?token=fixture",
    communicationDeliveryId: "12345678-1234-4234-8234-123456789abc",
  });
  assert.equal(
    payloads[0].Messages[0].Headers["List-Unsubscribe-Post"],
    "List-Unsubscribe=One-Click",
  );
  assert.match(payloads[0].Messages[0].Headers["List-Unsubscribe"], /^<https:/);
  assert.equal(
    payloads[0].Messages[0].CustomID,
    "AIAIAC-COM-DEL:12345678-1234-4234-8234-123456789abc",
  );
  await provider.send(message);
  assert.equal(payloads[1].Messages[0].Headers, undefined);
  assert.equal(payloads[1].Messages[0].CustomID, undefined);
});
test("provider rejections and ambiguous HTTP/network outcomes have distinct retry eligibility", async () => {
  const message = {
    toEmail: "person@example.com",
    toName: "Fixture",
    subject: "Fixture",
    html: "<p>Fixture</p>",
    text: "Fixture",
  };
  for (const [status, outcome] of [
    [400, "REJECTED"],
    [429, "REJECTED"],
    [408, "UNKNOWN"],
    [500, "UNKNOWN"],
  ] as const) {
    const provider = new MailjetProvider({
      apiKey: "fixture",
      secretKey: "fixture",
      fromEmail: "sender@example.invalid",
      fromName: "AIAIAC",
      fetchImplementation: async () => new Response("Fixture", { status }),
    });
    await assert.rejects(
      provider.send(message),
      (error) =>
        error instanceof MailjetDeliveryError && error.outcome === outcome,
    );
  }
});
