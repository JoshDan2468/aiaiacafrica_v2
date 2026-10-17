import type { EmailService } from "../email/email.service";
import type { RegistrationRecoveryRepository } from "../repositories/registrationRecovery.repository";

export class RegistrationNotificationService {
  constructor(
    private readonly repository: RegistrationRecoveryRepository,
    private readonly emailService: Pick<EmailService, "sendRegistrationAdminNotification">,
    private readonly roles: readonly string[] = ["SUPER_ADMIN", "ADMIN"],
    private readonly now: () => Date = () => new Date(),
    private readonly notificationEmail?: string,
  ) {}

  async send(registrationReference: string): Promise<void> {
    try {
      const now = this.now();
      const claims = await this.repository.claimNotifications(registrationReference, this.roles, now);
      const deliveredToInbox = new Set<string>();
      for (const claim of claims) {
        let sent = false;
        try {
          const email = this.notificationEmail ?? claim.email;
          if (!deliveredToInbox.has(email.toLowerCase())) {
            await this.emailService.sendRegistrationAdminNotification({ ...claim, email });
            deliveredToInbox.add(email.toLowerCase());
          }
          sent = true;
        } catch (error) {
          console.error("Registration admin notification delivery failed", {
            errorType: error instanceof Error ? error.name : "UnknownEmailError",
          });
        }
        await this.repository.recordNotificationResult(claim.id, sent, this.now());
      }
    } catch (error) {
      console.error("Registration admin notification workflow failed", {
        errorType: error instanceof Error ? error.name : "UnknownNotificationError",
        databaseCode:
          typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : undefined,
      });
    }
  }
}
