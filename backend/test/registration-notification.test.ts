import assert from "node:assert/strict";
import test from "node:test";
import type { RegistrationRecoveryRepository } from "../src/repositories/registrationRecovery.repository";
import { RegistrationNotificationService } from "../src/services/registrationNotification.service";
import type { RegistrationNotificationClaim } from "../src/types/registrationRecovery";

test("each registration notifies Super Admin and Admin once", async () => {
  const reference = "AIAIAC-DEL-REGISTRATION";
  const submittedAt = new Date("2026-10-03T09:00:00.000Z");
  const claims: RegistrationNotificationClaim[] = [
    {
      id: "super-notification",
      email: "super@example.test",
      fullName: "Super Admin",
      registrationReference: reference,
      delegateName: "Ada Okafor",
      delegateType: "PROFESSIONAL",
      companyName: "Example Ltd",
      country: "Nigeria",
      submittedAt,
    },
    {
      id: "admin-notification",
      email: "admin@example.test",
      fullName: "Admin",
      registrationReference: reference,
      delegateName: "Ada Okafor",
      delegateType: "PROFESSIONAL",
      companyName: "Example Ltd",
      country: "Nigeria",
      submittedAt,
    },
  ];
  let claimed = false;
  const results: Array<{ id: string; sent: boolean }> = [];
  const delivered: string[] = [];
  const repository = {
    async claimNotifications(
      registrationReference: string,
      roles: readonly string[],
    ) {
      assert.equal(registrationReference, reference);
      assert.deepEqual(roles, ["SUPER_ADMIN", "ADMIN"]);
      if (claimed) return [];
      claimed = true;
      return claims;
    },
    async recordNotificationResult(id: string, sent: boolean) {
      results.push({ id, sent });
    },
  } as unknown as RegistrationRecoveryRepository;
  const service = new RegistrationNotificationService(repository, {
    async sendRegistrationAdminNotification(claim) {
      delivered.push(claim.email);
    },
  });

  await service.send(reference);
  await service.send(reference);

  assert.deepEqual(delivered, ["super@example.test", "admin@example.test"]);
  assert.deepEqual(results, [
    { id: "super-notification", sent: true },
    { id: "admin-notification", sent: true },
  ]);
});

test("one failed recipient does not prevent the other registration email", async () => {
  const now = new Date("2026-10-03T09:00:00.000Z");
  const claims: RegistrationNotificationClaim[] = [
    {
      id: "super-notification",
      email: "super@example.test",
      fullName: "Super Admin",
      registrationReference: "AIAIAC-DEL-REGISTRATION",
      delegateName: "Ada Okafor",
      delegateType: "STUDENT",
      companyName: "Example University",
      country: "Nigeria",
      submittedAt: now,
    },
    {
      id: "admin-notification",
      email: "admin@example.test",
      fullName: "Admin",
      registrationReference: "AIAIAC-DEL-REGISTRATION",
      delegateName: "Ada Okafor",
      delegateType: "STUDENT",
      companyName: "Example University",
      country: "Nigeria",
      submittedAt: now,
    },
  ];
  const results: Array<{ id: string; sent: boolean }> = [];
  const repository = {
    async claimNotifications() {
      return claims;
    },
    async recordNotificationResult(id: string, sent: boolean) {
      results.push({ id, sent });
    },
  } as unknown as RegistrationRecoveryRepository;
  const delivered: string[] = [];
  const service = new RegistrationNotificationService(repository, {
    async sendRegistrationAdminNotification(claim) {
      if (claim.email === "super@example.test")
        throw new Error("Synthetic mail failure");
      delivered.push(claim.email);
    },
  });

  await service.send("AIAIAC-DEL-REGISTRATION");

  assert.deepEqual(delivered, ["admin@example.test"]);
  assert.deepEqual(results, [
    { id: "super-notification", sent: false },
    { id: "admin-notification", sent: true },
  ]);
});


test("dedicated registration inbox receives one branded notification for claimed staff recipients", async () => {
  const delivered: string[] = [];
  const results: boolean[] = [];
  const repository = {
    async claimNotifications() {
      return ["super", "admin"].map((id) => ({
        id, email: `${id}@example.test`, fullName: "Staff",
        registrationReference: "AIAIAC-DEL-FIXTURE", delegateName: "Fixture Attendee",
        delegateType: "PROFESSIONAL", companyName: "Fixture", country: "Nigeria",
        submittedAt: new Date(),
      }));
    },
    async recordNotificationResult(_id: string, sent: boolean) { results.push(sent); },
  } as unknown as RegistrationRecoveryRepository;
  const service = new RegistrationNotificationService(repository, {
    async sendRegistrationAdminNotification(claim) { delivered.push(claim.email); },
  }, ["SUPER_ADMIN", "ADMIN"], undefined, "register@aiaiacafrica.com");
  await service.send("AIAIAC-DEL-FIXTURE");
  assert.deepEqual(delivered, ["register@aiaiacafrica.com"]);
  assert.deepEqual(results, [true, true]);
});
