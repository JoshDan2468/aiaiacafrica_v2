import { createDelegateReference } from "./delegate.service";
import type { StudentVerificationRepository } from "../repositories/studentVerification.repository";
import type {
  StudentApplicationInput,
  StudentVerificationListFilters,
} from "../types/studentVerification";
import {
  createStudentContinuationToken,
  hashStudentContinuationToken,
} from "./studentEvidence.service";
import type { EmailVerificationService } from "./emailVerification.service";
import type { RegistrationNotificationService } from "./registrationNotification.service";

export class StudentVerificationService {
  constructor(
    private readonly repository: StudentVerificationRepository,
    private readonly nextReference: () => string = createDelegateReference,
    private readonly tokenTtlHours = 24,
    private readonly now: () => Date = () => new Date(),
    private readonly createContinuationToken: () => string = createStudentContinuationToken,
    private readonly emailVerification?: Pick<EmailVerificationService, "issueInitial">,
    private readonly registrationNotification?: Pick<RegistrationNotificationService, "send">,
  ) {}

  async createApplication(input: StudentApplicationInput) {
    const continuationToken = this.createContinuationToken();
    const continuationTokenExpiresAt = new Date(
      this.now().getTime() + this.tokenTtlHours * 60 * 60 * 1000,
    );
    const application = await this.repository.createApplication(
      input,
      this.nextReference,
      {
        tokenHash: hashStudentContinuationToken(continuationToken),
        expiresAt: continuationTokenExpiresAt,
      },
    );
    await this.registrationNotification?.send(application.reference);
    const verificationEmailSent =
      (await this.emailVerification?.issueInitial(application.reference)) ?? false;
    return {
      ...application,
      continuationToken,
      continuationTokenExpiresAt,
      verificationEmailSent,
    };
  }

  list(filters: StudentVerificationListFilters) {
    return this.repository.list(filters);
  }
}
