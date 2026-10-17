import assert from "node:assert/strict";
import test from "node:test";
import {
  communicationPurposes,
  requiresCampaignConsent,
  type CommunicationCampaign,
} from "../src/types/communication";
import {
  communicationContentSchema,
  audienceRequestSchema,
} from "../src/validators/communication.validator";
import {
  audienceSql,
  postgresCommunicationRepository,
} from "../src/repositories/communication.repository";
import { CommunicationService } from "../src/services/communication.service";
import { EmailService } from "../src/email/email.service";
import { communicationPreferences } from "../src/repositories/communicationPreference.repository";

const base = {
  title: "Event announcement",
  subject: "Conference update",
  preheader: "AIAIAC news",
  heading: "Conference update",
  body: "Here is the latest conference information.",
  audience: { code: "ALL_CONTACTS" as const },
};
test("conference purposes preserve existing campaigns and consent boundaries", () => {
  assert.equal(communicationContentSchema.parse(base).purpose, "MARKETING");
  for (const purpose of communicationPurposes.filter((p) =>
    requiresCampaignConsent(p),
  )) {
    assert.equal(
      communicationContentSchema.parse({ ...base, purpose }).purpose,
      purpose,
    );
    assert.equal(requiresCampaignConsent(purpose), true);
    assert.match(
      audienceSql({ code: "ALL_CONTACTS", purpose }).sql,
      /pref.consent='OPTED_IN'/,
    );
  }
  assert.equal(requiresCampaignConsent("PAYMENT_REMINDER"), false);
});
test("combined category audiences include actual records and matching imported prospects", () => {
  for (const [code, table, category] of [
    ["ALL_DELEGATE_CONTACTS", "delegate_registrations", "PROSPECTIVE_DELEGATE"],
    ["ALL_SPONSOR_CONTACTS", "sponsor_applications", "PROSPECTIVE_SPONSOR"],
    [
      "ALL_EXHIBITOR_CONTACTS",
      "exhibitor_applications",
      "PROSPECTIVE_EXHIBITOR",
    ],
  ] as const) {
    const query = audienceSql({ code, purpose: "MARKETING" });
    assert.ok(query.sql.includes(table));
    assert.ok(query.sql.includes("communication_manual_contacts"));
    assert.deepEqual(query.values, [category]);
    assert.match(query.sql, /DISTINCT ON/);
    assert.equal(
      audienceRequestSchema.safeParse({
        code,
        purpose: "PAYMENT_REMINDER",
        paymentStatus: "UNPAID",
      }).success,
      false,
    );
  }
});
test("every marketing purpose fails closed without unsubscribe configuration", async () => {
  let confirmed = 0,
    sent = 0;
  for (const purpose of communicationPurposes.filter((p) =>
    requiresCampaignConsent(p),
  )) {
    const campaign = {
      ...base,
      purpose,
      id: "fixture",
      reference: "AIAIAC-COM-1234ABCD",
      status: "DRAFT",
      revision: 1,
    } as CommunicationCampaign;
    const repository = {
      get: async () => campaign,
      confirm: async () => {
        confirmed++;
        return true;
      },
    } as unknown as typeof postgresCommunicationRepository;
    const service = new CommunicationService(
      repository,
      new EmailService(
        {
          send: async () => {
            sent++;
          },
        },
        "https://example.invalid",
      ),
      { create: async () => {} },
      true,
      undefined,
      { publicApiUrl: "", secret: "", preferences: communicationPreferences },
    );
    await assert.rejects(
      service.confirm(campaign.reference, "a".repeat(64), "fixture-admin"),
    );
    assert.match(service.preview(campaign).html, /unsubscribe/);
  }
  assert.equal(confirmed, 0);
  assert.equal(sent, 0);
});
