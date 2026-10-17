import { createHash, randomBytes } from "node:crypto";
import { countAbstractWords } from "../abstracts/wordCount";
import type { EmailService } from "../email/email.service";
import {
  AbstractDeadlinePassedError,
  AbstractDuplicateError,
  type AbstractSubmissionRepository,
} from "../repositories/abstractSubmission.repository";
import type {
  AbstractContent,
  AbstractListFilters,
  AbstractSubmissionInput,
} from "../types/abstractSubmission";

export const genericAbstractRecoveryMessage =
  "If the details match an Abstract submission, a secure recovery email will be sent.";

export function hashAbstractToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function abstractContentFingerprint(content: AbstractContent): string {
  const normalized = [
    content.title.trim().replace(/\s+/g, " ").toLowerCase(),
    content.abstractBody.trim().replace(/\s+/g, " ").toLowerCase(),
  ].join("\n");
  return createHash("sha256").update(normalized).digest("hex");
}

function createReference(): string {
  return `AIAIAC-ABS-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

export class AbstractSubmissionService {
  constructor(
    private readonly repository: AbstractSubmissionRepository,
    private readonly emailService: EmailService,
    private readonly submissionDeadline: Date,
    private readonly continuationTtlHours = 24,
    private readonly recoveryTtlMinutes = 30,
    private readonly now: () => Date = () => new Date(),
    private readonly referenceFactory: () => string = createReference,
    private readonly tokenFactory: () => string = createToken,
  ) {}

  async create(input: AbstractSubmissionInput) {
    const now = this.now();
    const keyHash = hashAbstractToken(input.idempotencyKey);
    const existing = await this.repository.findBySubmissionKey(keyHash);
    if (existing) {
      if (
        existing.continuation_token_hash !== keyHash ||
        existing.author_email !== input.authorEmail ||
        existing.content_fingerprint !== abstractContentFingerprint(input)
      ) {
        throw new AbstractDuplicateError();
      }
      await this.deliverPendingNotifications(existing.reference);
      return {
        created: false,
        reference: existing.reference,
        title: existing.title,
        wordCount: Number(existing.word_count),
        status: existing.status,
        submittedAt: existing.submitted_at,
        continuationToken: input.idempotencyKey,
        continuationTokenExpiresAt: existing.continuation_token_expires_at,
        nextStep:
          "Your abstract is under review. Speaker participation and the speaker fee will be communicated separately.",
      };
    }
    if (now > this.submissionDeadline) throw new AbstractDeadlinePassedError();
    const wordCount = countAbstractWords(input.abstractBody);
    const continuationExpiresAt = new Date(
      now.getTime() + this.continuationTtlHours * 60 * 60_000,
    );
    const result = await this.repository.create(
      input,
      this.referenceFactory(),
      wordCount,
      abstractContentFingerprint(input),
      keyHash,
      continuationExpiresAt,
      now,
    );
    if (
      !result.created &&
      (result.row.continuation_token_hash !== keyHash ||
        result.row.author_email !== input.authorEmail ||
        result.row.content_fingerprint !== abstractContentFingerprint(input))
    ) {
      throw new AbstractDuplicateError();
    }
    await this.deliverPendingNotifications(result.row.reference);
    return {
      created: result.created,
      reference: result.row.reference,
      title: result.row.title,
      wordCount: Number(result.row.word_count),
      status: result.row.status,
      submittedAt: result.row.submitted_at,
      continuationToken: input.idempotencyKey,
      continuationTokenExpiresAt: result.row.continuation_token_expires_at,
      nextStep:
        "Your abstract is under review. Speaker participation and the speaker fee will be communicated separately.",
    };
  }

  async authorize(reference: string, rawToken: string) {
    const id = await this.repository.authorize(
      reference,
      hashAbstractToken(rawToken),
      this.now(),
    );
    return { id, reference };
  }

  getWorkspace(authorization: { id: string }) {
    return this.repository.getPublicState(authorization.id);
  }

  updateRevision(authorization: { id: string }, content: AbstractContent) {
    return this.repository.updateRevision(
      authorization.id,
      content,
      countAbstractWords(content.abstractBody),
      abstractContentFingerprint(content),
      this.now(),
    );
  }

  async resubmit(authorization: { id: string }) {
    // An explicit Admin revision request remains actionable after the initial call deadline.
    const result = await this.repository.resubmit(authorization.id, this.now());
    await this.deliverPendingNotifications(result.reference);
    return result;
  }

  list(filters: AbstractListFilters) {
    return this.repository.list(filters);
  }

  getAdminDetail(reference: string) {
    return this.repository.getAdminDetail(reference);
  }

  async review(
    reference: string,
    action: "REVIEW_STARTED" | "REVISION_REQUIRED" | "ACCEPTED" | "REJECTED",
    adminId: string,
    authorVisibleReason: string | null,
    internalNote: string | null,
  ) {
    const result = await this.repository.review(
      reference,
      action,
      adminId,
      authorVisibleReason,
      internalNote,
      this.now(),
    );
    if (action !== "REVIEW_STARTED")
      await this.deliverPendingNotifications(reference);
    return result;
  }

  async requestRecovery(reference: string, email: string) {
    const now = this.now();
    const rawToken = this.tokenFactory();
    const expiresAt = new Date(
      now.getTime() + this.recoveryTtlMinutes * 60_000,
    );
    const recipient = await this.repository.createRecovery(
      reference,
      email,
      hashAbstractToken(rawToken),
      expiresAt,
      now,
    );
    if (!recipient) return;
    try {
      await this.emailService.sendAbstractRecovery({
        ...recipient,
        rawToken,
        expiresAt,
      });
    } catch (error) {
      console.error("Abstract recovery email delivery failed", {
        reference,
        errorType: error instanceof Error ? error.name : "UnknownEmailError",
      });
    }
  }

  async exchangeRecovery(rawRecoveryToken: string) {
    const now = this.now();
    const continuationToken = this.tokenFactory();
    const expiresAt = new Date(
      now.getTime() + this.continuationTtlHours * 60 * 60_000,
    );
    const result = await this.repository.exchangeRecovery(
      hashAbstractToken(rawRecoveryToken),
      hashAbstractToken(continuationToken),
      expiresAt,
      now,
    );
    return {
      reference: result.reference,
      continuationToken,
      continuationTokenExpiresAt: expiresAt,
    };
  }

  retryNotifications(reference: string) {
    return this.deliverPendingNotifications(reference);
  }

  private async deliverPendingNotifications(
    reference: string,
  ): Promise<number> {
    let claims;
    try {
      claims = await this.repository.claimNotifications(reference, this.now());
    } catch (error) {
      console.error("Abstract notification claim failed", {
        reference,
        errorType: error instanceof Error ? error.name : "UnknownDeliveryError",
      });
      return 0;
    }
    await Promise.all(
      claims.map(async (claim) => {
        let sent = false;
        let recoveryToken: string | undefined;
        try {
          if (claim.notificationType === "REVISION_REQUIRED") {
            recoveryToken = this.tokenFactory();
            const now = this.now();
            const expiresAt = new Date(
              now.getTime() + this.recoveryTtlMinutes * 60_000,
            );
            await this.repository.createRecovery(
              claim.reference,
              null,
              hashAbstractToken(recoveryToken),
              expiresAt,
              now,
            );
          }
          await this.emailService.sendAbstractNotification({
            email: claim.email,
            fullName: claim.fullName,
            reference: claim.reference,
            title: claim.title,
            notificationType: claim.notificationType,
            authorVisibleReason: claim.authorVisibleReason,
            ...(recoveryToken ? { recoveryToken } : {}),
          });
          sent = true;
        } catch (error) {
          console.error("Abstract notification delivery failed", {
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
          console.error("Abstract notification result update failed", {
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
