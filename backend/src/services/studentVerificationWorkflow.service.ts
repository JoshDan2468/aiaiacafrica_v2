import { randomBytes } from "node:crypto";
import type { EmailService } from "../email/email.service";
import type { StudentVerificationWorkflowRepository } from "../repositories/studentVerificationWorkflow.repository";
import type { AuthorizedStudentEvidenceUpload } from "../types/studentEvidence";
import {
  createStudentContinuationToken,
  hashStudentContinuationToken,
} from "./studentEvidence.service";

export const genericStudentRecoveryMessage =
  "If the details match an eligible Student application, a secure recovery email will be sent.";

export class StudentVerificationWorkflowService {
  constructor(
    private readonly repository: StudentVerificationWorkflowRepository,
    private readonly emailService: EmailService,
    private readonly continuationTokenTtlHours = 24,
    private readonly recoveryTokenTtlMinutes = 30,
    private readonly now: () => Date = () => new Date(),
    private readonly createRecoveryToken: () => string = () =>
      randomBytes(32).toString("base64url"),
    private readonly createContinuationToken: () => string = createStudentContinuationToken,
  ) {}

  getStudentState(authorization: AuthorizedStudentEvidenceUpload) {
    return this.repository.getPublicState(authorization.studentVerificationId);
  }

  getAdminDetail(registrationReference: string) {
    return this.repository.getAdminDetail(registrationReference);
  }

  async submit(authorization: AuthorizedStudentEvidenceUpload) {
    const result = await this.repository.submit(
      authorization.studentVerificationId,
      this.now(),
    );
    await this.deliverPendingNotifications(result.registrationReference);
    return result;
  }

  async review(
    registrationReference: string,
    action: "MORE_INFORMATION_REQUIRED" | "APPROVED" | "REJECTED",
    adminId: string,
    note: string | null,
  ) {
    const result = await this.repository.review(
      registrationReference,
      action,
      adminId,
      note,
      this.now(),
    );
    await this.deliverPendingNotifications(result.registrationReference);
    return result;
  }

  async requestRecovery(registrationReference: string, email: string) {
    const now = this.now();
    const rawToken = this.createRecoveryToken();
    const expiresAt = new Date(
      now.getTime() + this.recoveryTokenTtlMinutes * 60_000,
    );
    const recipient = await this.repository.createRecovery(
      registrationReference,
      email,
      hashStudentContinuationToken(rawToken),
      expiresAt,
      now,
    );
    if (!recipient) return;
    try {
      await this.emailService.sendStudentRecovery({
        email: recipient.email,
        fullName: recipient.fullName,
        registrationReference: recipient.registrationReference,
        rawToken,
        expiresAt,
      });
    } catch (error) {
      console.error("Student verification recovery email delivery failed", {
        registrationReference: recipient.registrationReference,
        errorType: error instanceof Error ? error.name : "UnknownEmailError",
      });
    }
  }

  async exchangeRecovery(rawRecoveryToken: string) {
    const now = this.now();
    const continuationToken = this.createContinuationToken();
    const continuationTokenExpiresAt = new Date(
      now.getTime() + this.continuationTokenTtlHours * 60 * 60_000,
    );
    const recipient = await this.repository.exchangeRecovery(
      hashStudentContinuationToken(rawRecoveryToken),
      hashStudentContinuationToken(continuationToken),
      continuationTokenExpiresAt,
      now,
    );
    return {
      registrationReference: recipient.registrationReference,
      continuationToken,
      continuationTokenExpiresAt,
    };
  }

  async retryNotifications(registrationReference: string) {
    return this.deliverPendingNotifications(registrationReference);
  }

  private async deliverPendingNotifications(registrationReference: string) {
    let claims;
    try {
      claims = await this.repository.claimNotifications(
        registrationReference,
        this.now(),
      );
    } catch (error) {
      console.error("Student verification notification claim failed", {
        registrationReference,
        errorType: error instanceof Error ? error.name : "UnknownDeliveryError",
      });
      return 0;
    }
    await Promise.all(
      claims.map(async (claim) => {
        let sent = false;
        try {
          await this.emailService.sendStudentVerification({
            email: claim.email,
            fullName: claim.fullName,
            registrationReference: claim.registrationReference,
            notificationType: claim.notificationType,
            reason: claim.note,
          });
          sent = true;
        } catch (error) {
          console.error("Student verification notification delivery failed", {
            registrationReference: claim.registrationReference,
            notificationId: claim.id,
            errorType:
              error instanceof Error ? error.name : "UnknownEmailError",
          });
        }
        try {
          await this.repository.recordNotificationResult(claim.id, sent);
        } catch (error) {
          console.error("Student verification notification result failed", {
            registrationReference: claim.registrationReference,
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
