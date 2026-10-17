import { hashEventPassCredential } from "../eventPass/eventPassCredential";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";
import {
  evaluateCheckIn,
  type CheckInCandidate,
  type CheckInRepository,
} from "../repositories/checkIn.repository";
import type { CheckInResult, RecentCheckIn } from "../types/checkIn";

export type ConfirmCheckInInput =
  | { readonly method: "QR"; readonly credential: string }
  | {
      readonly method: "MANUAL_LOOKUP";
      readonly registrationReference: string;
    };

export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository,
    private readonly audits: AdminAuditRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async validate(credential: string, adminId: string): Promise<CheckInResult> {
    const candidate = await this.repository.findByCredentialHash(
      hashEventPassCredential(credential),
    );
    const result = evaluateCheckIn(candidate);
    await this.auditResult(result, candidate, adminId, "QR");
    return result;
  }

  async lookup(
    query: string,
    adminId: string,
  ): Promise<{ matches: CheckInResult[] }> {
    const candidates = await this.repository.lookup(query.trim(), 10);
    await this.audits.create({
      adminId,
      action: "MANUAL_ATTENDEE_LOOKUP",
      entityType: "ADMIN_USER",
      entityId: adminId,
      metadata: { found: candidates.length > 0 },
      createdAt: this.now(),
    });
    const matches = candidates.map(evaluateCheckIn);
    for (let index = 0; index < candidates.length; index += 1) {
      await this.auditResult(
        matches[index]!,
        candidates[index]!,
        adminId,
        "MANUAL_LOOKUP",
      );
    }
    return { matches };
  }

  confirm(input: ConfirmCheckInInput, adminId: string): Promise<CheckInResult> {
    return this.repository.confirm(
      input.method === "QR"
        ? { credentialHash: hashEventPassCredential(input.credential) }
        : {
            registrationReference: input.registrationReference
              .trim()
              .toUpperCase(),
          },
      input.method,
      adminId,
      this.now(),
    );
  }

  async recent(limit: number): Promise<{ items: RecentCheckIn[] }> {
    return {
      items: await this.repository.recent(Math.min(50, Math.max(1, limit))),
    };
  }

  count(): Promise<{ today: number; total: number }> {
    return this.repository.count(this.now());
  }

  private auditResult(
    result: CheckInResult,
    candidate: CheckInCandidate | null,
    adminId: string,
    method: "QR" | "MANUAL_LOOKUP",
  ): Promise<void> {
    return this.audits.create({
      adminId,
      action:
        result.status === "VALID_ACTIVE_PASS"
          ? "PASS_VALIDATED"
          : result.status === "ALREADY_CHECKED_IN"
            ? "CHECK_IN_ALREADY_COMPLETED"
            : "CHECK_IN_DENIED",
      entityType: candidate?.eventPassId ? "EVENT_PASS" : "ADMIN_USER",
      entityId: candidate?.eventPassId ?? adminId,
      metadata: {
        status: result.status,
        method,
        registrationReference: candidate?.registrationReference ?? null,
      },
      createdAt: this.now(),
    });
  }
}
