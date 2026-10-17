import { createHash, randomBytes } from "node:crypto";
import type { EmailService } from "../email/email.service";
import {
  EnquiryNotFoundError,
  type EnquiryRepository,
} from "../repositories/enquiry.repository";
import type {
  EnquiryDecision,
  EnquiryInput,
  EnquiryListFilters,
  EnquiryNotificationRole,
} from "../types/enquiry";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function enquiryFingerprint(input: EnquiryInput): string {
  return sha256(
    JSON.stringify([
      input.firstName,
      input.lastName,
      input.email,
      input.phone ?? "",
      input.organization ?? "",
      input.country ?? "",
      input.category,
      input.subject,
      input.message,
    ]),
  );
}

function createReference(): string {
  return `AIAIAC-ENQ-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export class EnquiryService {
  constructor(
    private readonly repository: EnquiryRepository,
    private readonly emailService: EmailService,
    private readonly notificationRoles: readonly EnquiryNotificationRole[],
    private readonly now: () => Date = () => new Date(),
    private readonly referenceFactory: () => string = createReference,
  ) {}

  async create(input: EnquiryInput) {
    const result = await this.repository.create(
      input,
      this.referenceFactory(),
      sha256(input.idempotencyKey),
      enquiryFingerprint(input),
      this.notificationRoles,
      this.now(),
    );
    await this.deliverPending(result.row.reference);
    return {
      created: result.created,
      reference: result.row.reference,
      category: result.row.category,
      subject: result.row.subject,
      status: result.row.status,
      submittedAt: result.row.created_at,
      acknowledgement:
        "We have received your enquiry. Please keep the reference for future correspondence.",
    };
  }

  list(filters: EnquiryListFilters) {
    return this.repository.list(filters);
  }
  getDetail(reference: string) {
    return this.repository.getDetail(reference);
  }

  transition(
    reference: string,
    nextStatus: EnquiryDecision,
    adminId: string,
    note: string | null,
  ) {
    return this.repository.transition(
      reference,
      nextStatus,
      adminId,
      note,
      this.now(),
    );
  }

  async retryNotifications(reference: string) {
    if (!(await this.repository.getDetail(reference)))
      throw new EnquiryNotFoundError();
    return this.deliverPending(reference);
  }

  private async deliverPending(reference: string): Promise<number> {
    let claims;
    try {
      claims = await this.repository.claimNotifications(reference, this.now());
    } catch (error) {
      console.error("Enquiry notification claim failed", {
        reference,
        errorType: error instanceof Error ? error.name : "UnknownDeliveryError",
      });
      return 0;
    }
    await Promise.all(
      claims.map(async (claim) => {
        let sent = false;
        try {
          await this.emailService.sendEnquiryNotification({
            email: claim.email,
            name: claim.name,
            recipientKind: claim.recipientKind,
            reference: claim.reference,
            category: claim.category,
            subject: claim.subject,
            sender: claim.sender,
            submittedAt: claim.submittedAt,
          });
          sent = true;
        } catch (error) {
          console.error("Enquiry notification delivery failed", {
            reference,
            notificationId: claim.id,
            errorType:
              error instanceof Error ? error.name : "UnknownEmailError",
          });
        }
        try {
          await this.repository.recordNotificationResult(
            claim.id,
            sent,
            this.now(),
          );
        } catch (error) {
          console.error("Enquiry notification result update failed", {
            reference,
            notificationId: claim.id,
            errorType:
              error instanceof Error ? error.name : "UnknownDeliveryError",
          });
        }
      }),
    );
    return claims.length;
  }
}
