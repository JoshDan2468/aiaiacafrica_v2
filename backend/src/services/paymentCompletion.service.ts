/**
 * Payment completion service
 *
 * Runs only after trusted payment persistence. It issues one event pass and
 * performs bounded, separately tracked delegate and oversight notifications.
 * Notification failure can never reverse a financial transaction.
 */

import type { EmailService } from "../email/email.service";
import { reportRecoveredPaymentError } from "../observability/operationContext";
import {
  createEventPassCredential,
  renderEventPassQrBase64,
} from "../eventPass/eventPassCredential";
import type { PaymentCompletionRepository } from "../repositories/paymentCompletion.repository";
import type { PaymentRecord } from "../types/payment";
import type { PaymentNotificationRole } from "../types/paymentCompletion";

export class PaymentCompletionService {
  constructor(
    private readonly repository: PaymentCompletionRepository,
    private readonly emailService: EmailService,
    private readonly notificationRoles: readonly PaymentNotificationRole[],
    private readonly now: () => Date = () => new Date(),
  ) {}

  async process(payment: PaymentRecord): Promise<void> {
    if (payment.status !== "PAID") return;
    const now = this.now();
    const credential = createEventPassCredential();
    const delegateClaim = await this.repository.claimDelegateConfirmation(
      payment.paymentReference,
      credential.hash,
      now,
    );

    if (delegateClaim?.shouldSend) {
      let sent = false;
      try {
        const qrBase64 = await renderEventPassQrBase64(credential.raw);
        await this.emailService.sendPaymentConfirmation({
          email: payment.delegateEmail,
          fullName: payment.delegateName,
          registrationReference: payment.registrationReference,
          paymentReference: payment.paymentReference,
          packageName: payment.packageName,
          delegateCategory:
            payment.packageCode === "STUDENT"
              ? "Student Delegate"
              : "Professional Delegate",
          currency: payment.currency,
          amountMinor: payment.amountMinor,
          eventPassQrBase64: qrBase64,
        });
        sent = true;
      } catch (error) {
        reportRecoveredPaymentError(error, "delegate_payment_confirmation", payment.paymentReference);
        console.error("Delegate payment confirmation delivery failed", {
          paymentReference: payment.paymentReference,
          errorType: error instanceof Error ? error.name : "UnknownEmailError",
        });
      }
      await this.repository.recordDelegateConfirmationResult(
        payment.paymentReference,
        sent,
      );
    }

    const adminClaims = await this.repository.claimAdminNotifications(
      payment.id,
      this.notificationRoles,
      now,
    );
    await Promise.all(
      adminClaims.map(async (claim) => {
        let sent = false;
        try {
          const acceptance =
            await this.emailService.sendAdminPaymentNotification({
              email: claim.email,
              fullName: claim.fullName,
              delegateName: payment.delegateName,
              delegateEmail: payment.delegateEmail,
              registrationReference: payment.registrationReference,
              paymentReference: payment.paymentReference,
              packageName: payment.packageName,
              delegateCategory:
                payment.packageCode === "STUDENT"
                  ? "Student Delegate"
                  : "Professional Delegate",
              currency: payment.currency,
              amountMinor: payment.amountMinor,
              confirmedAt: payment.paidAt ?? payment.verifiedAt ?? now,
            });
          if (acceptance) {
            console.info("Admin payment notification accepted by provider", {
              paymentReference: payment.paymentReference,
              notificationId: claim.id,
              provider: acceptance.provider,
              providerStatus: acceptance.status,
              providerMessageUuid: acceptance.messageUuid,
              providerMessageId: acceptance.messageId,
            });
          }
          sent = true;
        } catch (error) {
          reportRecoveredPaymentError(error, "admin_payment_notification", payment.paymentReference);
          console.error("Admin payment notification delivery failed", {
            paymentReference: payment.paymentReference,
            notificationId: claim.id,
            errorType:
              error instanceof Error ? error.name : "UnknownEmailError",
          });
        }
        await this.repository.recordAdminNotificationResult(claim.id, sent);
      }),
    );
  }

  async notifyReconciliation(payment: PaymentRecord): Promise<void> {
    const claims = await this.repository.claimReconciliationNotifications(
      payment.id,
      this.notificationRoles,
      this.now(),
    );
    await Promise.all(
      claims.map(async (claim) => {
        let sent = false;
        try {
          await this.emailService.sendPaymentReconciliationAlert({
            email: claim.email,
            fullName: claim.fullName,
            delegateName: payment.delegateName,
            registrationReference: payment.registrationReference,
            paymentReference: payment.paymentReference,
            currency: payment.currency,
            amountMinor: payment.amountMinor,
            paymentStatus: payment.status,
            reason:
              payment.reconciliationReason ??
              payment.failureReason ??
              "FINANCE_REVIEW_REQUIRED",
          });
          sent = true;
        } catch (error) {
          reportRecoveredPaymentError(error, "payment_reconciliation_notification", payment.paymentReference);
          console.error("Payment reconciliation alert delivery failed", {
            paymentReference: payment.paymentReference,
            notificationId: claim.id,
            errorType:
              error instanceof Error ? error.name : "UnknownEmailError",
          });
        }
        await this.repository.recordAdminNotificationResult(claim.id, sent);
      }),
    );
  }
}
