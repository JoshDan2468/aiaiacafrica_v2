import type { EmailService } from "../email/email.service";
import type { DelegateRegistrationAcknowledgementRepository } from "../repositories/delegateRegistrationAcknowledgement.repository";

export class DelegateRegistrationAcknowledgementService {
  constructor(
    private readonly repository: DelegateRegistrationAcknowledgementRepository,
    private readonly emailService: Pick<
      EmailService,
      "sendDelegateRegistrationAcknowledgement"
    >,
  ) {}

  async send(registrationId: string): Promise<void> {
    try {
      const claim = await this.repository.claim(registrationId);
      if (!claim) return;
      let sent = false;
      try {
        await this.emailService.sendDelegateRegistrationAcknowledgement(claim);
        sent = true;
      } catch (error) {
        console.error("Delegate registration acknowledgement delivery failed", {
          errorType: error instanceof Error ? error.name : "UnknownEmailError",
        });
      }
      await this.repository.recordResult(registrationId, sent);
    } catch (error) {
      // Registration has already committed; email infrastructure must not turn it into a 500.
      console.error("Delegate registration acknowledgement workflow failed", {
        errorType:
          error instanceof Error ? error.name : "UnknownAcknowledgementError",
      });
    }
  }
}
