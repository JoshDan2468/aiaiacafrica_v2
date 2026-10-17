import assert from "node:assert/strict";
import test from "node:test";
import { parseContactCsv } from "../src/services/contactCsv";
import { manualContactSchema } from "../src/validators/contact.validator";
import { audienceRequestSchema } from "../src/validators/communication.validator";
import { audienceSql } from "../src/repositories/communication.repository";
import { isRegisteredDelegateAudience } from "../src/types/communication";

test("CSV prospects retain category and unknown consent without creating registrations", () => {
  const row = parseContactCsv(
    "name,email,category,source\nAda,ada@example.invalid,PROSPECTIVE_SPONSOR,Conference prospects",
  )[0]!;
  const contact = manualContactSchema.parse(row.value);
  assert.equal(contact.category, "PROSPECTIVE_SPONSOR");
  assert.equal(contact.consent, "UNKNOWN");
  assert.equal(contact.sourceLabel, "Conference prospects");
  assert.equal(
    manualContactSchema.safeParse({ ...row.value, category: "SPONSOR" })
      .success,
    false,
  );
  assert.equal(
    manualContactSchema.parse({ name: "Ada", email: "ada@example.invalid" })
      .category,
    undefined,
  );
});

test("prospective delegates cannot use registered delegate payment filters", () => {
  assert.equal(isRegisteredDelegateAudience("PROSPECTIVE_DELEGATES"), false);
  assert.equal(
    audienceRequestSchema.safeParse({
      code: "PROSPECTIVE_DELEGATES",
      paymentStatus: "UNPAID",
    }).success,
    false,
  );
});

test("prospect audience reads active manual contacts and excludes existing registrations", () => {
  const result = audienceSql({ code: "PROSPECTIVE_DELEGATES", purpose: "MARKETING" });
  assert.match(result.sql, /communication_manual_contacts/);
  assert.match(result.sql, /NOT EXISTS/);
  assert.match(result.sql, /delegate_registrations/);
  assert.ok(result.values.includes("PROSPECTIVE_DELEGATE"));
});
