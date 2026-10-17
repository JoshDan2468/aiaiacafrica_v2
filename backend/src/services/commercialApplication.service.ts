import { randomBytes } from "node:crypto";
import type { EmailService } from "../email/email.service";
import type { CommercialApplicationRepository } from "../repositories/commercialApplication.repository";
import type {
  CommercialApplicationKind,
  CommercialApplicationListFilters,
  ExhibitorApplicationInput,
  SponsorApplicationInput,
} from "../types/commercialApplication";

function createReference(kind: CommercialApplicationKind): string {
  const prefix = kind === "SPONSOR" ? "SPN" : "EXH";
  return `AIAIAC-${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export class CommercialApplicationService {
  constructor(
    private readonly repository: CommercialApplicationRepository,
    private readonly emailService: EmailService,
    private readonly now: () => Date = () => new Date(),
    private readonly referenceFactory: (
      kind: CommercialApplicationKind,
    ) => string = createReference,
  ) {}

  async createSponsor(input: SponsorApplicationInput) {
    const result = await this.repository.create(
      "SPONSOR",
      input,
      input.sponsorshipTier,
      this.referenceFactory("SPONSOR"),
      this.now(),
    );
    await this.deliverPendingNotifications("SPONSOR", result.reference);
    return result;
  }

  async createExhibitor(input: ExhibitorApplicationInput) {
    const result = await this.repository.create(
      "EXHIBITOR",
      input,
      input.exhibitionOption,
      this.referenceFactory("EXHIBITOR"),
      this.now(),
    );
    await this.deliverPendingNotifications("EXHIBITOR", result.reference);
    return result;
  }

  list(
    kind: CommercialApplicationKind,
    filters: CommercialApplicationListFilters,
  ) {
    return this.repository.list(kind, filters);
  }

  getDetail(kind: CommercialApplicationKind, reference: string) {
    return this.repository.getDetail(kind, reference);
  }

  async review(
    kind: CommercialApplicationKind,
    reference: string,
    action: "MORE_INFORMATION_REQUIRED" | "CONFIRMED" | "DECLINED",
    adminId: string,
    applicantReason: string | null,
    internalNote: string | null,
  ) {
    const result = await this.repository.transition(
      kind,
      reference,
      action,
      adminId,
      applicantReason,
      internalNote,
      this.now(),
    );
    await this.deliverPendingNotifications(kind, reference);
    return result;
  }

  retryNotifications(kind: CommercialApplicationKind, reference: string) {
    return this.deliverPendingNotifications(kind, reference);
  }

  private async deliverPendingNotifications(
    kind: CommercialApplicationKind,
    reference: string,
  ): Promise<number> {
    let claims;
    try {
      claims = await this.repository.claimNotifications(
        kind,
        reference,
        this.now(),
      );
    } catch (error) {
      console.error("Commercial application notification claim failed", {
        kind,
        reference,
        errorType: error instanceof Error ? error.name : "UnknownDeliveryError",
      });
      return 0;
    }
    await Promise.all(
      claims.map(async (claim) => {
        let sent = false;
        try {
          await this.emailService.sendCommercialApplication({
            kind: claim.kind,
            email: claim.email,
            fullName: claim.fullName,
            organizationName: claim.organizationName,
            reference: claim.reference,
            packageName: claim.packageName,
            currency: claim.currency,
            priceMinor: claim.priceMinor,
            notificationType: claim.notificationType,
            applicantReason: claim.applicantReason,
          });
          sent = true;
        } catch (error) {
          console.error("Commercial application email delivery failed", {
            kind,
            reference,
            notificationId: claim.id,
            errorType:
              error instanceof Error ? error.name : "UnknownEmailError",
          });
        }
        try {
          await this.repository.recordNotificationResult(
            kind,
            claim.id,
            sent,
            this.now(),
          );
        } catch (error) {
          console.error("Commercial notification result update failed", {
            kind,
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
