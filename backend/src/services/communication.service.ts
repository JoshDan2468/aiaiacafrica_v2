import { communicationPreferences } from "../repositories/communicationPreference.repository";
import { UnsubscribeTokens, validateSchedule } from "./communicationSafety";
import { MailjetDeliveryError } from "../email/providers/mailjet.provider";
import { createHash } from "node:crypto";
import {
  isRegisteredDelegateAudience,
  isEventParticipantAudience,
  requiresCampaignConsent,
  communicationAudiences,
  communicationPurposes,
} from "../types/communication";
import { withTransaction } from "../config/database";
import { createPublicError } from "../middleware/error.middleware";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";
import { postgresCommunicationRepository } from "../repositories/communication.repository";
import type {
  CommunicationAudience,
  CommunicationContent,
} from "../types/communication";
import type { DatabaseExecutor, TransactionRunner } from "../types/database";
import { communicationTemplate } from "../email/templates/communication.template";
import type { EmailService } from "../email/email.service";

type Repository = Omit<
  typeof postgresCommunicationRepository,
  "audienceSummary"
> &
  Partial<Pick<typeof postgresCommunicationRepository, "audienceSummary">>;
const maxRecipients = 500;

export class CommunicationService {
  constructor(
    private readonly repository: Repository,
    private readonly email: EmailService,
    private readonly audits: AdminAuditRepository,
    private readonly bulkSendEnabled: boolean,
    private readonly transaction: TransactionRunner = withTransaction,
    private readonly safety = {
      publicApiUrl: (process.env.COMMUNICATIONS_PUBLIC_API_URL ?? "").replace(
        /\/+$/,
        "",
      ),
      secret: process.env.COMMUNICATIONS_UNSUBSCRIBE_SECRET ?? "",
      preferences: communicationPreferences,
    },
  ) {}

  async audience(audience: CommunicationAudience) {
    const recipients = await this.repository.recipients(audience);
    const summary = await this.repository.audienceSummary?.(audience);
    return {
      ...summary,
      recipients: recipients.slice(0, 500),
      count: recipients.length,
      fingerprint: createHash("sha256")
        .update(recipients.map((item) => item.email).join("\n"))
        .digest("hex"),
      overLimit: recipients.length > maxRecipients,
      limit: maxRecipients,
    };
  }

  preview(content: CommunicationContent) {
    return communicationTemplate(content, {
      unsubscribeUrl: requiresCampaignConsent(content.purpose)
        ? this.safety.publicApiUrl +
          "/api/communications/unsubscribe?token=PREVIEW_ONLY"
        : undefined,
    });
  }
  settings() {
    return {
      supportedAudiences: communicationAudiences,
      supportedPurposes: communicationPurposes,
      bulkSendEnabled: this.bulkSendEnabled,
      providerConfigured: this.email.isConfigured,
      marketingConfigured:
        this.safety.secret.length >= 32 &&
        this.safety.publicApiUrl.startsWith("https://"),
      campaignLimit: 500,
      batchSize: 10,
      perMinuteLimit: 30,
    };
  }
  async preferences(page: number, suppressed: boolean) {
    return this.safety.preferences.list(page, suppressed);
  }
  async setPreference(
    input: Parameters<typeof communicationPreferences.set>[0],
    adminId: string,
  ) {
    return this.safety.preferences.set(input, adminId, (id, executor) =>
      this.audits.create(
        {
          adminId,
          action: input.suppressed
            ? "CONTACT_SUPPRESSED"
            : "CONTACT_CONSENT_CHANGED",
          entityType: "COMMUNICATION_CONTACT",
          entityId: id,
          metadata: {
            consent: input.consent ?? null,
            suppressed: input.suppressed ?? null,
          },
        },
        executor,
      ),
    );
  }
  async cancel(reference: string, adminId: string) {
    if (
      !(await this.repository.cancel(reference, (campaign, executor) =>
        this.audit(adminId, "CAMPAIGN_CANCELLED", campaign, executor),
      ))
    )
      throw createPublicError(409, "Only scheduled campaigns can be cancelled");
    return this.get(reference);
  }
  async runDue() {
    if (!this.bulkSendEnabled || !this.email.isConfigured) return;
    for (const campaign of await this.repository.due()) {
      try {
        if (
          !campaign.admin ||
          !(await this.safety.preferences.canDispatch(campaign.admin))
        )
          continue;
        await this.deliver(campaign.reference, false, campaign.admin);
      } catch {
        console.error(
          "Communications campaign dispatch paused; recipients retained",
        );
      }
    }
  }
  private marketingReady() {
    if (
      !this.safety.publicApiUrl.startsWith("https://") ||
      this.safety.secret.length < 32
    )
      throw createPublicError(
        503,
        "Configure the HTTPS unsubscribe endpoint and signing secret first",
      );
  }

  async create(content: CommunicationContent, adminId: string) {
    return this.transaction(async (client) => {
      const campaign = await this.repository.create(content, adminId, client);
      await this.audit(adminId, "CAMPAIGN_CREATED", campaign, client);
      return campaign;
    });
  }

  async update(
    reference: string,
    content: CommunicationContent,
    adminId: string,
  ) {
    return this.transaction(async (client) => {
      const campaign = await this.repository.update(reference, content, client);
      if (!campaign)
        throw createPublicError(409, "Only draft campaigns can be updated");
      await this.audit(adminId, "CAMPAIGN_UPDATED", campaign, client);
      return campaign;
    });
  }

  async get(reference: string) {
    const campaign = await this.repository.get(reference);
    if (!campaign) throw createPublicError(404, "Campaign not found");
    return campaign;
  }

  list(page: number, status?: string) {
    return this.repository.list(page, status);
  }
  deliveries(page: number, status?: string, campaign?: string) {
    return this.repository.deliveries(page, status, campaign);
  }

  async testSend(reference: string, address: string, adminId: string) {
    const campaign = await this.get(reference);
    if (campaign.status !== "DRAFT")
      throw createPublicError(409, "Test sends require a draft campaign");
    if (!this.email.isConfigured)
      throw createPublicError(503, "Email provider is not configured");
    const rendered = communicationTemplate(campaign, { test: true });
    const result = await this.email.sendCommunication({
      toEmail: address.trim().toLowerCase(),
      toName: "AIAIAC test recipient",
      ...rendered,
    });
    await this.audit(adminId, "CAMPAIGN_TEST_SENT", campaign);
    return { accepted: true, providerMessageId: result?.messageId ?? null };
  }

  async confirm(
    reference: string,
    fingerprint: string,
    adminId: string,
    revision?: number,
    scheduledAt?: string,
  ) {
    const schedule = validateSchedule(scheduledAt);
    if (!this.bulkSendEnabled)
      throw createPublicError(503, "Bulk communications are not enabled");
    if (!this.email.isConfigured)
      throw createPublicError(503, "Email provider is not configured");
    const campaign = await this.get(reference);
    if (campaign.status !== "DRAFT")
      throw createPublicError(409, "Campaign has already been confirmed");
    if (requiresCampaignConsent(campaign.purpose)) this.marketingReady();
    if (
      campaign.purpose === "ESSENTIAL_EVENT_UPDATE" &&
      !isEventParticipantAudience(campaign.audience.code)
    )
      throw createPublicError(
        422,
        "Event updates require existing conference participants",
      );
    if (
      campaign.purpose === "PAYMENT_REMINDER" &&
      (!isRegisteredDelegateAudience(campaign.audience.code) ||
        !["UNPAID", "ABANDONED"].includes(
          campaign.audience.paymentStatus ?? "",
        ))
    )
      throw createPublicError(
        422,
        "Payment reminders require unpaid or abandoned delegates",
      );
    const recipients = await this.repository.recipients({
      ...campaign.audience,
      purpose: campaign.purpose ?? "MARKETING",
    });
    if (!recipients.length) throw createPublicError(422, "Audience is empty");
    if (recipients.length > maxRecipients)
      throw createPublicError(
        422,
        `Audience exceeds ${maxRecipients} recipients`,
      );
    const actual = createHash("sha256")
      .update(recipients.map((item) => item.email).join("\n"))
      .digest("hex");
    if (actual !== fingerprint)
      throw createPublicError(
        409,
        "Audience changed; review the recipient count again",
      );
    const confirmed = await this.repository.confirm(
      reference,
      recipients,
      (executor) =>
        this.audit(
          adminId,
          schedule ? "CAMPAIGN_SCHEDULED" : "CAMPAIGN_CONFIRMED",
          campaign,
          executor,
        ),
      schedule,
      revision ?? campaign.revision ?? 1,
      adminId,
    );
    if (!confirmed)
      throw createPublicError(
        409,
        "Campaign changed or was already confirmed; reload and review it",
      );
    return this.get(reference);
  }

  async deliver(reference: string, retry: boolean, adminId: string) {
    if (!this.bulkSendEnabled)
      throw createPublicError(503, "Bulk communications are not enabled");
    if (!this.email.isConfigured)
      throw createPublicError(503, "Email provider is not configured");
    const campaign = await this.get(reference);
    if (
      campaign.status === "DRAFT" ||
      campaign.status === "SCHEDULED" ||
      campaign.status === "CANCELLED"
    )
      throw createPublicError(409, "Review and confirm the campaign first");
    if (campaign.status === "SENT") return { processed: 0, campaign };
    if (retry) await this.audit(adminId, "CAMPAIGN_RETRIED", campaign);
    else if (
      campaign.sent === 0 &&
      campaign.failed === 0 &&
      campaign.claimed === 0 &&
      campaign.pending === campaign.recipientCount
    )
      await this.audit(adminId, "CAMPAIGN_SEND_STARTED", campaign);
    if (requiresCampaignConsent(campaign.purpose)) this.marketingReady();
    const batch = await this.repository.claim(reference, retry);
    // Sequential delivery keeps provider concurrency bounded even for the full 500-recipient limit.
    for (const recipient of batch) {
      try {
        if (!(await this.repository.isEligible(campaign, recipient.email))) {
          await this.repository.resolveSkipped(recipient.id);
          continue;
        }
        const unsubscribeUrl = requiresCampaignConsent(campaign.purpose)
          ? this.safety.publicApiUrl +
            "/api/communications/unsubscribe?token=" +
            new UnsubscribeTokens(this.safety.secret).issue(
              recipient.email,
              campaign.reference,
            )
          : undefined;
        const rendered = communicationTemplate(campaign, { unsubscribeUrl });
        const result = await this.email.sendCommunication({
          toEmail: recipient.email,
          toName: recipient.name,
          communicationDeliveryId: recipient.id,
          ...rendered,
          ...(unsubscribeUrl ? { unsubscribeUrl } : {}),
        });
        await this.repository.settle(
          recipient.id,
          true,
          result?.messageId ?? null,
          null,
          result?.messageUuid ?? null,
        );
      } catch (error) {
        // Never persist provider error text; it may contain credentials or sensitive data.
        if (
          !(error instanceof MailjetDeliveryError) ||
          error.outcome === "UNKNOWN"
        ) {
          await this.repository.resolveSkipped(recipient.id, true);
          continue;
        }
        await this.repository.settle(
          recipient.id,
          false,
          null,
          error instanceof Error ? error.name.slice(0, 120) : "DeliveryError",
        );
      }
    }
    const updated = await this.repository.refreshStatus(reference);
    if (
      updated &&
      !updated.pending &&
      !updated.claimed &&
      (updated.status !== campaign.status || batch.length > 0)
    )
      await this.audit(adminId, "CAMPAIGN_SEND_COMPLETED", updated);
    return { processed: batch.length, campaign: updated };
  }

  private audit(
    adminId: string,
    action: Parameters<AdminAuditRepository["create"]>[0]["action"],
    campaign: { id: string; reference: string },
    executor?: DatabaseExecutor,
  ) {
    return this.audits.create(
      {
        adminId,
        action,
        entityType: "COMMUNICATION_CAMPAIGN",
        entityId: campaign.id,
        metadata: { reference: campaign.reference },
      },
      executor,
    );
  }
}
