import { createHash, randomBytes } from "node:crypto";
import type { EmailService } from "../email/email.service";
import type { RegistrationRecoveryRepository } from "../repositories/registrationRecovery.repository";

export class RegistrationRecoveryTokenError extends Error {}

export function hashRegistrationRecoveryToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export class RegistrationRecoveryService {
  constructor(
    private readonly repository: RegistrationRecoveryRepository,
    private readonly emailService: Pick<EmailService, "sendRegistrationRecovery">,
    private readonly recoveryTtlMinutes = 30,
    private readonly continuationTtlHours = 24,
    private readonly now: () => Date = () => new Date(),
    private readonly tokenFactory: () => string = () => randomBytes(32).toString("base64url"),
  ) {}

  async request(email: string): Promise<void> {
    const rawToken = this.tokenFactory();
    const now = this.now();
    const expiresAt = new Date(now.getTime() + this.recoveryTtlMinutes * 60_000);
    const recipient = await this.repository.issue(
      email,
      hashRegistrationRecoveryToken(rawToken),
      expiresAt,
      now,
    );
    if (!recipient) return;
    try {
      await this.emailService.sendRegistrationRecovery({
        email: recipient.email,
        fullName: recipient.fullName,
        registrationReference: recipient.registrationReference,
        rawToken,
        expiresAt,
      });
    } catch (error) {
      console.error("Registration recovery delivery failed", {
        errorType: error instanceof Error ? error.name : "UnknownEmailError",
      });
    }
  }

  async exchange(rawRecoveryToken: string) {
    this.assertToken(rawRecoveryToken);
    const continuationToken = this.tokenFactory();
    const now = this.now();
    const continuationTokenExpiresAt = new Date(
      now.getTime() + this.continuationTtlHours * 60 * 60_000,
    );
    const workspace = await this.repository.exchange(
      hashRegistrationRecoveryToken(rawRecoveryToken),
      hashRegistrationRecoveryToken(continuationToken),
      continuationTokenExpiresAt,
      now,
    );
    if (!workspace) throw new RegistrationRecoveryTokenError();
    return { workspace, continuationToken, continuationTokenExpiresAt };
  }

  async authorize(rawContinuationToken: string) {
    this.assertToken(rawContinuationToken);
    const workspace = await this.repository.authorize(
      hashRegistrationRecoveryToken(rawContinuationToken),
      this.now(),
    );
    if (!workspace) throw new RegistrationRecoveryTokenError();
    return workspace;
  }

  findLatestPaymentReference(registrationReference: string): Promise<string | null> {
    return this.repository.findLatestPaymentReference(registrationReference);
  }

  async createContinuationForRegistration(registrationReference: string) {
    const rawToken = this.tokenFactory();
    const now = this.now();
    const expiresAt = new Date(now.getTime() + this.continuationTtlHours * 60 * 60_000);
    const workspace = await this.repository.issueContinuation(
      registrationReference,
      hashRegistrationRecoveryToken(rawToken),
      expiresAt,
      now,
    );
    if (!workspace) throw new RegistrationRecoveryTokenError();
    return { continuationToken: rawToken, continuationTokenExpiresAt: expiresAt, workspace };
  }

  async sendPaymentRecovery(paymentReference: string): Promise<void> {
    const rawToken = this.tokenFactory();
    const now = this.now();
    const expiresAt = new Date(now.getTime() + this.recoveryTtlMinutes * 60_000);
    const claim = await this.repository.claimPaymentRecoveryNotification(
      paymentReference,
      hashRegistrationRecoveryToken(rawToken),
      expiresAt,
      now,
    );
    if (!claim) return;
    let sent = false;
    try {
      await this.emailService.sendRegistrationRecovery({
        email: claim.email,
        fullName: claim.fullName,
        registrationReference: claim.registrationReference,
        rawToken,
        expiresAt,
        delegateType: claim.delegateType,
        paymentStatus: claim.paymentStatus,
      });
      sent = true;
    } catch (error) {
      console.error("Payment recovery delivery failed", {
        paymentReference,
        errorType: error instanceof Error ? error.name : "UnknownEmailError",
      });
    }
    await this.repository.recordPaymentRecoveryNotificationResult(
      claim.notificationId,
      sent,
      this.now(),
    );
  }

  private assertToken(token: string): void {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new RegistrationRecoveryTokenError();
  }
}
