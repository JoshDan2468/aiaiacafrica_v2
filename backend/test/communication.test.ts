import { MailjetDeliveryError } from "../src/email/providers/mailjet.provider";
import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import type { RequestHandler } from "express";
import { createApplication } from "../src/app";
import { createAdminMutationSecurity } from "../src/middleware/adminMutationSecurity.middleware";
import { createCommunicationRouter } from "../src/routes/communication.routes";
import { createApiRouter } from "../src/routes";
import { EmailService } from "../src/email/email.service";
import type {
  EmailProvider,
  TransactionalEmail,
} from "../src/email/email.types";
import { communicationTemplate } from "../src/email/templates/communication.template";
import { roleHasPermission } from "../src/config/permissions";
import { getPermissionsForRole } from "../src/config/permissions";
import type { AdminRole } from "../src/types/admin";
import {
  normalizeRecipients,
  audienceSql,
  postgresCommunicationRepository,
} from "../src/repositories/communication.repository";

test("combined platform audience reads existing categories and retains consent/suppression checks", () => {
  const query = audienceSql({code:"ALL_CONTACTS",purpose:"MARKETING"});
  for (const table of ["delegate_registrations","sponsor_applications","exhibitor_applications","abstract_submissions","communication_manual_contacts"]) assert.ok(query.sql.includes(table));
  assert.equal((query.sql.match(/pref.consent='OPTED_IN'/g) ?? []).length,5);
  assert.equal((query.sql.match(/coalesce\(pref.suppressed,false\)=false/g) ?? []).length,5);
  assert.deepEqual(query.values,[]);
});
import type { AdminAuditRepository } from "../src/repositories/adminAudit.repository";
import { CommunicationService } from "../src/services/communication.service";
import type {
  CommunicationCampaign,
  CommunicationContent,
  CommunicationDelivery,
} from "../src/types/communication";
import type { DatabaseExecutor } from "../src/types/database";
import {
  audienceRequestSchema,
  communicationContentSchema,
} from "../src/validators/communication.validator";

const content: CommunicationContent = {
  title: "Programme update",
  subject: "Programme update",
  preheader: "AIAIAC 2027 news",
  heading: "Our programme",
  body: "An important conference programme update.",
  audience: {
    code: "PROFESSIONAL_DELEGATES",
    paymentStatus: "PAID",
    country: "Nigeria",
    currency: "NGN",
  },
};

test("communications permissions are independent from Finance and Student review", () => {
  for (const permission of [
    "communications.read",
    "communications.create",
    "communications.send",
    "communications.manage",
  ] as const) {
    assert.equal(roleHasPermission("COMMUNICATIONS", permission), true);
    assert.equal(roleHasPermission("SUPER_ADMIN", permission), true);
    assert.equal(roleHasPermission("ADMIN", permission), true);
    assert.equal(roleHasPermission("FINANCE", permission), false);
    assert.equal(roleHasPermission("REGISTRATION_MANAGER", permission), false);
  }
  assert.equal(roleHasPermission("COMMUNICATIONS", "payments.manage"), false);
  assert.equal(
    roleHasPermission("COMMUNICATIONS", "student_verifications.review"),
    false,
  );
  assert.equal(roleHasPermission("COMMUNICATIONS", "users.manage"), false);
});

test("audience and composer validation reject unsafe or unrelated fields", () => {
  assert.equal(audienceRequestSchema.safeParse(content.audience).success, true);
  assert.equal(
    audienceRequestSchema.safeParse({ code: "SPONSORS", paymentStatus: "PAID" })
      .success,
    false,
  );
  assert.equal(
    audienceRequestSchema.safeParse({
      code: "ALL_DELEGATES",
      emails: ["attacker@example.com"],
    }).success,
    false,
  );
  assert.equal(
    communicationContentSchema.safeParse({
      ...content,
      ctaLabel: "Visit",
      ctaUrl: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    communicationContentSchema.safeParse({
      ...content,
      ctaLabel: "Visit",
      ctaUrl: "https://example.com",
    }).success,
    true,
  );
  assert.equal(
    communicationContentSchema.safeParse({
      ...content,
      ctaLabel: "Visit",
      ctaUrl: "http://example.com",
    }).success,
    false,
  );
  assert.equal(
    communicationContentSchema.safeParse({ ...content, body: "x" }).success,
    false,
  );
});

test("recipient normalization excludes invalid addresses and deduplicates case-insensitively", () => {
  assert.deepEqual(
    normalizeRecipients([
      {
        email: " PERSON@example.com ",
        name: "First",
        sourceCategory: "PROFESSIONAL",
      },
      {
        email: "person@EXAMPLE.com",
        name: "Second",
        sourceCategory: "STUDENT",
      },
      { email: "not-an-address", name: "Bad", sourceCategory: "SPONSOR" },
    ]),
    [
      {
        email: "person@example.com",
        name: "First",
        sourceCategory: "PROFESSIONAL",
      },
    ],
  );
});

test("campaign preview escapes HTML and permits only HTTPS CTA", () => {
  const rendered = communicationTemplate({
    ...content,
    body: "Hello <script>alert(1)</script>",
    ctaLabel: "Visit",
    ctaUrl: "https://example.com",
  });
  assert.ok(rendered.html.includes("&lt;script&gt;"));
  assert.ok(!rendered.html.includes("<script>"));
  assert.ok(rendered.html.includes("AIAIAC Africa 2027"));
  assert.ok(rendered.text.includes("Hello <script>"));
});

test("protected routes enforce backend RBAC, CSRF, and strict audience input", async () => {
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
  const fake = {
    audience: async () => ({
      count: 0,
      fingerprint: "a".repeat(64),
      overLimit: false,
      limit: 500,
    }),
    preview: (value: CommunicationContent) => communicationTemplate(value),
  } as unknown as CommunicationService;
  const router = createCommunicationRouter({
    requireAuth: auth,
    mutationSecurity: createAdminMutationSecurity(["http://localhost:5173"]),
    service: fake,
  });
  const app = createApplication({
    apiRouter: createApiRouter({ communicationRouter: router }),
  });
  assert.equal(
    (await request(app).get("/api/admin/communications/templates")).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/admin/communications/templates")
        .set("X-Test-Role", "FINANCE")
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/admin/communications/templates")
        .set("X-Test-Role", "COMMUNICATIONS")
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/admin/communications/preview")
        .set("X-Test-Role", "COMMUNICATIONS")
        .send(content)
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/admin/communications/preview")
        .set("X-Test-Role", "COMMUNICATIONS")
        .set("X-AIAIAC-CSRF", "1")
        .send({
          ...content,
          audience: { ...content.audience, emails: ["attacker@example.com"] },
        })
    ).status,
    400,
  );
  const allowed = await request(app)
    .post("/api/admin/communications/preview")
    .set("X-Test-Role", "COMMUNICATIONS")
    .set("X-AIAIAC-CSRF", "1")
    .set("Origin", "http://localhost:5173")
    .send(content);
  assert.equal(allowed.status, 200);
  assert.ok(allowed.body.data.html.includes("AIAIAC Africa 2027"));
});

test("one-address test send uses the clean branded template without campaign delivery", async () => {
  const campaign: CommunicationCampaign = {
    ...content,
    id: "id",
    reference: "AIAIAC-COM-1234ABCD",
    status: "DRAFT",
    recipientCount: 0,
    createdBy: "Admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    sentAt: null,
    sent: 0,
    failed: 0,
    pending: 0,
    claimed: 0,
  };
  const messages: TransactionalEmail[] = [];
  const actions: string[] = [];
  const repository = {
    async get() {
      return campaign;
    },
  } as unknown as typeof postgresCommunicationRepository;
  const service = new CommunicationService(
    repository,
    new EmailService(
      {
        async send(message) {
          messages.push(message);
        },
      },
      "http://localhost",
    ),
    {
      async create(input) {
        actions.push(input.action);
      },
    },
    false,
  );
  await service.testSend(campaign.reference, "TEST@example.com", "admin-id");
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.toEmail, "test@example.com");
  assert.equal(messages[0]?.subject, campaign.subject);
  assert.ok(
    !messages[0]?.html.includes("TEST EMAIL — not a campaign delivery."),
  );
  assert.ok(!messages[0]?.text.includes("TEST EMAIL — not a campaign delivery."));
  assert.equal(campaign.status, "DRAFT");
  assert.deepEqual(actions, ["CAMPAIGN_TEST_SENT"]);
});

test("confirmation snapshots recipients; bounded batches, partial failure and retry never resend success", async () => {
  const recipients = Array.from({ length: 13 }, (_, index) => ({
    email: `recipient-${index}@example.com`,
    name: `Recipient ${index}`,
    sourceCategory: "PROFESSIONAL",
  }));
  let campaign: CommunicationCampaign = {
    ...content,
    id: "campaign-id",
    reference: "AIAIAC-COM-1234ABCD",
    status: "DRAFT",
    recipientCount: 0,
    createdBy: "Test Admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    sentAt: null,
    sent: 0,
    failed: 0,
    pending: 0,
    claimed: 0,
  };
  const deliveries: CommunicationDelivery[] = [];
  const accepted: string[] = [];
  let failedOnce = false;
  const auditActions: string[] = [];
  const provider: EmailProvider = {
    async send(message: TransactionalEmail) {
      if (message.toEmail === "recipient-4@example.com" && !failedOnce) {
        failedOnce = true;
        throw new MailjetDeliveryError("REJECTED");
      }
      accepted.push(message.toEmail);
      return {
        provider: "MAILJET",
        status: "accepted",
        messageUuid: "uuid",
        messageId: "message-id",
      };
    },
  };
  const repository = {
    async isEligible() {
      return true;
    },
    async recipients() {
      return recipients;
    },
    async get() {
      return campaign;
    },
    async confirm(
      _reference: string,
      rows: typeof recipients,
      onConfirmed: (executor: DatabaseExecutor) => Promise<void>,
    ) {
      if (campaign.status !== "DRAFT") return false;
      deliveries.push(
        ...rows.map((row, index) => ({
          ...row,
          id: `${index}`,
          campaignId: campaign.id,
          status: "PENDING" as const,
          attempts: 0,
          providerMessageId: null,
          errorSummary: null,
          sentAt: null,
        })),
      );
      campaign = {
        ...campaign,
        status: "SENDING",
        recipientCount: rows.length,
        pending: rows.length,
      };
      await onConfirmed({} as DatabaseExecutor);
      return true;
    },
    async claim(_reference: string, retry: boolean) {
      const batch = deliveries
        .filter(
          (item) =>
            item.attempts < 3 &&
            (item.status === "PENDING" || (retry && item.status === "FAILED")),
        )
        .slice(0, 10);
      for (const item of batch) {
        item.status = "CLAIMED";
        item.attempts++;
      }
      return batch;
    },
    async settle(id: string, success: boolean) {
      const item = deliveries.find((candidate) => candidate.id === id)!;
      item.status = success ? "SENT" : "FAILED";
    },
    async refreshStatus() {
      const sent = deliveries.filter((item) => item.status === "SENT").length;
      const failed = deliveries.filter(
        (item) => item.status === "FAILED",
      ).length;
      const pending = deliveries.filter(
        (item) => item.status === "PENDING",
      ).length;
      const claimed = deliveries.filter(
        (item) => item.status === "CLAIMED",
      ).length;
      campaign = {
        ...campaign,
        sent,
        failed,
        pending,
        claimed,
        status:
          pending || claimed ? "SENDING" : failed ? "PARTIALLY_FAILED" : "SENT",
      };
      return campaign;
    },
  } as unknown as typeof postgresCommunicationRepository;
  const audits: AdminAuditRepository = {
    async create(input) {
      auditActions.push(input.action);
    },
  };
  const service = new CommunicationService(
    repository,
    new EmailService(provider, "http://localhost"),
    audits,
    true,
    undefined,
    {
      publicApiUrl: "https://api.example.invalid",
      secret: "fixture-signing-secret-32-characters",
      preferences: {} as never,
    },
  );
  const audience = await service.audience(content.audience);
  assert.equal(audience.count, 13);
  await service.confirm(campaign.reference, audience.fingerprint, "admin-id");
  await assert.rejects(
    service.confirm(campaign.reference, audience.fingerprint, "admin-id"),
  );
  const first = await service.deliver(campaign.reference, false, "admin-id");
  assert.equal(first.processed, 10);
  assert.equal(first.campaign?.sent, 9);
  assert.equal(first.campaign?.failed, 1);
  await service.deliver(campaign.reference, false, "admin-id");
  const beforeRetry = accepted.length;
  await service.deliver(campaign.reference, true, "admin-id");
  assert.equal(accepted.length, beforeRetry + 1);
  assert.equal(campaign.status, "SENT");
  assert.equal(campaign.sent, 13);
  assert.ok(auditActions.includes("CAMPAIGN_CONFIRMED"));
  assert.ok(auditActions.includes("CAMPAIGN_RETRIED"));
  assert.ok(auditActions.includes("CAMPAIGN_SEND_COMPLETED"));
});

