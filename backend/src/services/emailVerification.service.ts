import { createHash, randomBytes } from "node:crypto";
import type { EmailService } from "../email/email.service";
import type { EmailVerificationRepository } from "../repositories/emailVerification.repository";
import type { EmailVerificationResult } from "../types/emailVerification";

export const genericEmailVerificationResendMessage =
  "If the registration details match an unverified registration, a new verification link has been sent.";

export class EmailVerificationTokenError extends Error {}

export function hashEmailVerificationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}
export class EmailVerificationService {
  constructor(
    private readonly repository: EmailVerificationRepository,
    private readonly emailService: Pick<EmailService, "sendEmailVerification">,
    private readonly tokenTtlHours = 24,
    private readonly now: () => Date = () => new Date(),
    private readonly generateToken: () => string = () =>
      randomBytes(32).toString("base64url"),
  ) {}

  private async issue(
    registrationReference: string,
    email: string | null,
    requestKind: "INITIAL" | "RESEND",
  ): Promise<boolean> {
    const rawToken = this.generateToken();
    const issuedAt = this.now();
    const expiresAt = new Date(
      issuedAt.getTime() + this.tokenTtlHours * 60 * 60 * 1_000,
    );
    const result = await this.repository.issue(
      registrationReference,
      email,
      hashEmailVerificationToken(rawToken),
      expiresAt,
      requestKind,
      issuedAt,
    );
    if (result.kind !== "ISSUED") return false;

    let sent = false;
    try {
      await this.emailService.sendEmailVerification({
        email: result.recipient.email,
        fullName: result.recipient.fullName,
        registrationReference: result.recipient.registrationReference,
        rawToken,
        expiresAt: result.recipient.expiresAt,
      });
      sent = true;
    } catch {
      // The registration remains safely unverified and can request another link.
    }
    await this.repository.recordDelivery(
      result.recipient.registrationId,
      sent,
      this.now(),
    );
    return sent;
  }

  issueInitial(registrationReference: string): Promise<boolean> {
    return this.issue(registrationReference, null, "INITIAL");
  }

  async resend(registrationReference: string, email: string): Promise<void> {
    await this.issue(registrationReference, email, "RESEND");
  }

  async verify(rawToken: string): Promise<EmailVerificationResult> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      throw new EmailVerificationTokenError();
    }
    return this.repository.verify(
      hashEmailVerificationToken(rawToken),
      this.now(),
    );
  }
}
