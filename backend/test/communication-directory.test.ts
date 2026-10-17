import assert from "node:assert/strict";
import test from "node:test";
import {
  audienceSql,
  summarizeAudienceDirectory,
  type AudienceDirectoryRow,
  postgresCommunicationRepository,
} from "../src/repositories/communication.repository";
import { CommunicationService } from "../src/services/communication.service";
import { EmailService } from "../src/email/email.service";
import { audienceRequestSchema } from "../src/validators/communication.validator";
import { requiresCampaignConsent } from "../src/types/communication";
import { communicationContentSchema } from "../src/validators/communication.validator";

test("essential campaign content cannot disguise an imported audience as registered attendees", () => {
  const content = {
    purpose: "ESSENTIAL_EVENT_UPDATE",
    title: "Event logistics",
    subject: "Arrival details",
    preheader: "Your conference arrival",
    heading: "Arrival information",
    body: "Please review your conference arrival details.",
    audience: { code: "APPROVED_CONTACTS", purpose: "MARKETING" },
  };
  assert.equal(communicationContentSchema.safeParse(content).success, false);
  assert.equal(
    communicationContentSchema.safeParse({
      ...content,
      audience: { code: "ALL_DELEGATES" },
    }).success,
    true,
  );
});

test("essential updates are restricted to verified active registrations at query and request boundaries", () => {
  for (const code of [
    "ALL_DELEGATE_CONTACTS",
    "PROSPECTIVE_DELEGATES",
    "APPROVED_CONTACTS",
  ] as const) {
    assert.equal(
      audienceRequestSchema.safeParse({
        code,
        purpose: "ESSENTIAL_EVENT_UPDATE",
      }).success,
      false,
    );
    assert.ok(
      audienceSql({ code, purpose: "ESSENTIAL_EVENT_UPDATE" }).sql.includes(
        "WHERE false",
      ),
    );
  }
  const everyone = audienceSql({
    code: "ALL_CONTACTS",
    purpose: "ESSENTIAL_EVENT_UPDATE",
  });
  assert.ok(everyone.sql.includes("sponsor_applications"));
  assert.ok(everyone.sql.includes("exhibitor_applications"));
  assert.ok(everyone.sql.includes("abstract_submissions"));
  assert.ok(!everyone.sql.includes("communication_manual_contacts"));
  assert.ok(!everyone.sql.includes("pref.consent='OPTED_IN'"));
  assert.equal(
    audienceRequestSchema.safeParse({
      code: "ALL_CONTACTS",
      purpose: "ESSENTIAL_EVENT_UPDATE",
    }).success,
    true,
  );
  for (const code of [
    "ALL_DELEGATES",
    "PROFESSIONAL_DELEGATES",
    "STUDENT_DELEGATES",
  ] as const) {
    assert.equal(
      audienceRequestSchema.safeParse({
        code,
        purpose: "ESSENTIAL_EVENT_UPDATE",
      }).success,
      true,
    );
    const query = audienceSql({ code, purpose: "ESSENTIAL_EVENT_UPDATE" }).sql;
    assert.ok(query.includes("dr.email_verification_status='VERIFIED'"));
    assert.ok(
      query.includes("dr.registration_status NOT IN ('CANCELLED','REJECTED')"),
    );
    assert.ok(query.includes("coalesce(pref.suppressed,false)=false"));
    assert.ok(query.includes("<>'OPTED_OUT'"));
    assert.ok(!query.includes("pref.consent='OPTED_IN'"));
  }
  assert.equal(requiresCampaignConsent("ESSENTIAL_EVENT_UPDATE"), false);
  for (const purpose of [
    undefined,
    "MARKETING",
    "EVENT_ANNOUNCEMENT",
    "DELEGATE_UPDATE",
    "SPONSOR_OUTREACH",
    "EXHIBITOR_OUTREACH",
  ])
    assert.equal(requiresCampaignConsent(purpose), true);
  assert.deepEqual(
    summarizeAudienceDirectory(
      [
        {
          email: "unknown@example.invalid",
          name: "Test",
          sourceCategory: "PROFESSIONAL",
          communicationConsent: "UNKNOWN",
          communicationSuppressed: false,
        },
        {
          email: "out@example.invalid",
          name: "Test",
          sourceCategory: "PROFESSIONAL",
          communicationConsent: "OPTED_OUT",
          communicationSuppressed: false,
        },
        {
          email: "blocked@example.invalid",
          name: "Test",
          sourceCategory: "PROFESSIONAL",
          communicationConsent: "UNKNOWN",
          communicationSuppressed: true,
        },
      ],
      "ESSENTIAL_EVENT_UPDATE",
    ),
    {
      totalContacts: 3,
      excludedNoConsent: 0,
      excludedOptedOut: 1,
      excludedSuppressed: 1,
    },
  );
});

test("directory counts retain stored contacts and explain exclusive campaign exclusions", () => {
  const row = (
    email: string,
    consent = "UNKNOWN",
    suppressed = false,
  ): AudienceDirectoryRow => ({
    email,
    name: "Fixture",
    sourceCategory: "SPONSOR",
    communicationConsent: consent,
    communicationSuppressed: suppressed,
  });
  const rows = [
    row("known@example.invalid", "OPTED_IN"),
    row("unknown@example.invalid"),
    row("out@example.invalid", "OPTED_OUT"),
    row("suppressed@example.invalid", "OPTED_OUT", true),
    row(" KNOWN@EXAMPLE.INVALID ", "OPTED_IN"),
    row("invalid"),
  ];
  assert.deepEqual(summarizeAudienceDirectory(rows, "EVENT_ANNOUNCEMENT"), {
    totalContacts: 4,
    excludedSuppressed: 1,
    excludedOptedOut: 1,
    excludedNoConsent: 1,
  });
  assert.deepEqual(summarizeAudienceDirectory(rows, "PAYMENT_REMINDER"), {
    totalContacts: 4,
    excludedSuppressed: 1,
    excludedOptedOut: 1,
    excludedNoConsent: 0,
  });
});

test("directory query is separate from dispatch filtering and cannot be enabled by browser input", () => {
  const audience = {
    code: "ALL_CONTACTS" as const,
    purpose: "EVENT_ANNOUNCEMENT" as const,
  };
  const directory = audienceSql(audience, true);
  assert.ok(directory.sql.includes('"communicationConsent"'));
  assert.ok(!directory.sql.includes("AND pref.consent='OPTED_IN'"));
  assert.ok(!directory.sql.includes("LIMIT 5001"));
  const dispatch = audienceSql(audience);
  assert.equal(
    (dispatch.sql.match(/pref.consent='OPTED_IN'/g) || []).length,
    5,
  );
  assert.equal(
    (dispatch.sql.match(/coalesce\(pref.suppressed,false\)=false/g) || [])
      .length,
    5,
  );
  assert.equal(
    audienceRequestSchema.safeParse({ ...audience, directory: true }).success,
    false,
  );
});

test("audience response keeps sendable count and fingerprint independent of total stored contacts", async () => {
  const repository = {
    recipients: async () => [],
    audienceSummary: async () => ({
      totalContacts: 5,
      excludedNoConsent: 5,
      excludedSuppressed: 0,
      excludedOptedOut: 0,
    }),
  } as unknown as typeof postgresCommunicationRepository;
  let sent = 0;
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
  );
  const result = await service.audience({
    code: "ALL_CONTACTS",
    purpose: "EVENT_ANNOUNCEMENT",
  });
  assert.equal(result.totalContacts, 5);
  assert.equal(result.count, 0);
  assert.deepEqual(result.recipients, []);
  assert.equal(
    result.fingerprint,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assert.equal(sent, 0);
});
