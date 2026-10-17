import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { z } from "zod";
import {
  isRegisteredDelegateAudience,
  isEventParticipantAudience,
  requiresCampaignConsent,
} from "../types/communication";
import { getDatabasePool, withTransaction } from "../config/database";
import type {
  CommunicationAudience,
  CommunicationCampaign,
  CommunicationContent,
  CommunicationDelivery,
  CommunicationRecipient,
} from "../types/communication";
import type { DatabaseExecutor } from "../types/database";

const db = (executor?: DatabaseExecutor): DatabaseExecutor => {
  const pool = executor ?? getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
};

const emailSchema = z.email().max(254);

export function normalizeRecipients(
  rows: readonly CommunicationRecipient[],
): CommunicationRecipient[] {
  const seen = new Set<string>();
  const recipients: CommunicationRecipient[] = [];
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!emailSchema.safeParse(email).success || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      name: row.name.trim().slice(0, 200),
      sourceCategory: row.sourceCategory,
    });
  }
  return recipients.sort((a, b) => a.email.localeCompare(b.email));
}

/** Directory mode is reporting only; delivery always uses the default recipient filters. */
export function audienceSql(
  audience: CommunicationAudience,
  directory = false,
): {
  sql: string;
  values: unknown[];
} {
  if (
    audience.purpose === "ESSENTIAL_EVENT_UPDATE" &&
    !isEventParticipantAudience(audience.code)
  ) {
    // Fail closed even for historical drafts or direct repository callers.
    return {
      sql: 'SELECT NULL::text AS email,NULL::text AS name,NULL::text AS "sourceCategory" WHERE false',
      values: [],
    };
  }
  const combinedAudiences = {
    ALL_CONTACTS: [
      "ALL_DELEGATES",
      "SPONSORS",
      "EXHIBITORS",
      "ABSTRACT_AUTHORS",
      "APPROVED_CONTACTS",
    ],
    ALL_DELEGATE_CONTACTS: ["ALL_DELEGATES", "PROSPECTIVE_DELEGATES"],
    ALL_SPONSOR_CONTACTS: ["SPONSORS", "PROSPECTIVE_SPONSORS"],
    ALL_EXHIBITOR_CONTACTS: ["EXHIBITORS", "PROSPECTIVE_EXHIBITORS"],
  } as const;
  if (audience.code in combinedAudiences) {
    const sources = combinedAudiences[
      audience.code as keyof typeof combinedAudiences
    ].filter(
      (code) =>
        audience.purpose !== "ESSENTIAL_EVENT_UPDATE" ||
        code !== "APPROVED_CONTACTS",
    );
    const values: unknown[] = [];
    const queries = sources.map((code) => {
      const query = audienceSql({ code, purpose: audience.purpose }, directory);
      const offset = values.length;
      values.push(...query.values);
      return query.sql.replace(
        /\$(\d+)/g,
        (_match, index: string) => `$${Number(index) + offset}`,
      );
    });
    return {
      sql: `SELECT DISTINCT ON (lower(btrim(email))) lower(btrim(email)) AS email,name,"sourceCategory"${directory ? ',"communicationConsent","communicationSuppressed"' : ""} FROM (${queries.map((query) => `(${query})`).join(" UNION ALL ")}) eligible_contacts ORDER BY lower(btrim(email))${directory ? "" : " LIMIT 5001"}`,
      values,
    };
  }
  const values: unknown[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const conditions: string[] = [];
  let from: string;
  let select: string;
  if (isRegisteredDelegateAudience(audience.code)) {
    from =
      "delegate_registrations dr LEFT JOIN student_verifications sv ON sv.registration_id=dr.id";
    select =
      "dr.email AS email, concat_ws(' ',dr.first_name,dr.last_name) AS name, dr.package_type_snapshot AS \"sourceCategory\"";
    if (audience.purpose === "ESSENTIAL_EVENT_UPDATE")
      conditions.push(
        "dr.email_verification_status='VERIFIED'",
        "dr.registration_status NOT IN ('CANCELLED','REJECTED')",
      );
    if (audience.code === "PROFESSIONAL_DELEGATES")
      conditions.push("dr.package_type_snapshot='PROFESSIONAL'");
    if (audience.code === "STUDENT_DELEGATES")
      conditions.push("dr.package_type_snapshot='STUDENT'");
    if (audience.registrationStatus)
      conditions.push(
        `dr.registration_status=${add(audience.registrationStatus)}`,
      );
    if (["UNPAID", "ABANDONED"].includes(audience.paymentStatus ?? "")) {
      conditions.push(
        "(dr.package_type_snapshot='PROFESSIONAL' OR (dr.package_type_snapshot='STUDENT' AND sv.status='APPROVED'))",
        "EXISTS(SELECT 1 FROM delegate_package_prices price WHERE price.package_id=dr.package_id AND price.is_active=true)",
        "dr.payment_status IN ('PENDING','FAILED')",
        "dr.email_verification_status='VERIFIED'",
        "dr.registration_status NOT IN ('CANCELLED','REJECTED')",
        "NOT EXISTS(SELECT 1 FROM payment_transactions paid WHERE paid.registration_id=dr.id AND paid.status='PAID')",
      );
      if (audience.paymentStatus === "ABANDONED")
        conditions.push(
          "(SELECT pt.status FROM payment_transactions pt WHERE pt.registration_id=dr.id ORDER BY pt.created_at DESC,pt.id DESC LIMIT 1)='ABANDONED'",
        );
    } else if (audience.paymentStatus)
      conditions.push(`dr.payment_status=${add(audience.paymentStatus)}`);
    if (audience.verificationStatus)
      conditions.push(`sv.status=${add(audience.verificationStatus)}`);
    if (audience.country)
      conditions.push(`lower(dr.country)=lower(${add(audience.country)})`);
    if (audience.currency)
      conditions.push(
        `EXISTS (SELECT 1 FROM payment_transactions pt WHERE pt.id=dr.authoritative_payment_transaction_id AND pt.status='PAID' AND pt.currency=${add(audience.currency)})`,
      );
  } else if (audience.code.startsWith("PROSPECTIVE_")) {
    from = "communication_manual_contacts mc";
    select = `mc.email AS email,mc.name AS name,mc.category AS "sourceCategory"`;
    const categories = {
      PROSPECTIVE_DELEGATES: "PROSPECTIVE_DELEGATE",
      PROSPECTIVE_SPONSORS: "PROSPECTIVE_SPONSOR",
      PROSPECTIVE_EXHIBITORS: "PROSPECTIVE_EXHIBITOR",
    } as const;
    const category = categories[audience.code as keyof typeof categories];
    conditions.push("mc.status='ACTIVE'", `mc.category=${add(category)}`);
    const registered =
      audience.code === "PROSPECTIVE_DELEGATES"
        ? "SELECT 1 FROM delegate_registrations existing WHERE lower(btrim(existing.email))=mc.email"
        : audience.code === "PROSPECTIVE_SPONSORS"
          ? "SELECT 1 FROM sponsor_applications existing WHERE existing.event_year=2027 AND lower(btrim(existing.contact_email))=mc.email"
          : "SELECT 1 FROM exhibitor_applications existing WHERE existing.event_year=2027 AND lower(btrim(existing.contact_email))=mc.email";
    conditions.push(`NOT EXISTS(${registered})`);
  } else if (audience.code.includes("SPONSORS")) {
    from = "sponsor_applications sa";
    select =
      "sa.contact_email AS email, concat_ws(' ',sa.contact_first_name,sa.contact_last_name) AS name, 'SPONSOR' AS \"sourceCategory\"";
    conditions.push("sa.event_year=2027");
    if (audience.purpose === "ESSENTIAL_EVENT_UPDATE")
      conditions.push("sa.status NOT IN ('REJECTED','CANCELLED')");
    if (audience.code === "CONFIRMED_SPONSORS")
      conditions.push("sa.status='CONFIRMED'");
  } else if (audience.code.includes("EXHIBITORS")) {
    from = "exhibitor_applications ea";
    select =
      "ea.contact_email AS email, concat_ws(' ',ea.contact_first_name,ea.contact_last_name) AS name, 'EXHIBITOR' AS \"sourceCategory\"";
    conditions.push("ea.event_year=2027");
    if (audience.purpose === "ESSENTIAL_EVENT_UPDATE")
      conditions.push("ea.status NOT IN ('REJECTED','CANCELLED')");
    if (audience.code === "CONFIRMED_EXHIBITORS")
      conditions.push("ea.status='CONFIRMED'");
  } else if (audience.code === "APPROVED_CONTACTS") {
    from = "communication_manual_contacts mc";
    select = `mc.email AS email,mc.name AS name,mc.category AS "sourceCategory"`;
    conditions.push("mc.status='ACTIVE'");
  } else {
    from = "abstract_submissions a";
    select =
      "a.author_email AS email, concat_ws(' ',a.author_first_name,a.author_last_name) AS name, 'ABSTRACT_AUTHOR' AS \"sourceCategory\"";
    conditions.push("a.event_year=2027");
    if (audience.purpose === "ESSENTIAL_EVENT_UPDATE")
      conditions.push("a.status NOT IN ('REJECTED','WITHDRAWN')");
    if (audience.abstractStatus)
      conditions.push(`a.status=${add(audience.abstractStatus)}`);
  }
  return {
    sql: `SELECT source.*${directory ? ',coalesce(pref.consent,\'UNKNOWN\') AS "communicationConsent",coalesce(pref.suppressed,false) AS "communicationSuppressed"' : ""} FROM (SELECT ${select} FROM ${from}${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""}) source
      LEFT JOIN communication_preferences pref ON pref.email=lower(btrim(source.email))
      ${
        directory
          ? ""
          : `WHERE coalesce(pref.suppressed,false)=false AND coalesce(pref.consent,'UNKNOWN')<>'OPTED_OUT'
      ${requiresCampaignConsent(audience.purpose) ? "AND pref.consent='OPTED_IN'" : ""} LIMIT 5001`
      }`,
    values,
  };
}

export interface AudienceDirectoryRow extends CommunicationRecipient {
  communicationConsent: string;
  communicationSuppressed: boolean;
}

export function summarizeAudienceDirectory(
  rows: readonly AudienceDirectoryRow[],
  purpose?: string,
) {
  const preferences = new Map(
    rows.map((row) => [row.email.trim().toLowerCase(), row]),
  );
  const contacts = normalizeRecipients(rows);
  let excludedSuppressed = 0,
    excludedOptedOut = 0,
    excludedNoConsent = 0;
  for (const contact of contacts) {
    const preference = preferences.get(contact.email)!;
    // Exclusive reasons keep the totals understandable without counting someone twice.
    if (preference.communicationSuppressed) excludedSuppressed++;
    else if (preference.communicationConsent === "OPTED_OUT")
      excludedOptedOut++;
    else if (
      requiresCampaignConsent(purpose) &&
      preference.communicationConsent !== "OPTED_IN"
    )
      excludedNoConsent++;
  }
  return {
    totalContacts: contacts.length,
    excludedSuppressed,
    excludedOptedOut,
    excludedNoConsent,
  };
}

function mapCampaign(row: QueryResultRow): CommunicationCampaign {
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    subject: row.subject,
    preheader: row.preheader,
    heading: row.heading,
    body: row.body,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    audience: row.audience,
    status: row.status,
    recipientCount: row.recipient_count,
    purpose: row.purpose,
    revision: row.revision,
    scheduledAt: row.scheduled_at,
    confirmedBy: row.confirmed_by_admin_id,
    skipped: Number(row.skipped),
    uncertain: Number(row.uncertain),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at,
    sent: Number(row.sent),
    failed: Number(row.failed),
    pending: Number(row.pending),
    claimed: Number(row.claimed),
  };
}

const campaignSelect = `SELECT c.*, a.full_name AS created_by,
  (SELECT count(*) FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status='SKIPPED') AS skipped,
  (SELECT count(*) FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status='UNCERTAIN') AS uncertain,
  (SELECT count(*) FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status='SENT') AS sent,
  (SELECT count(*) FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status IN ('FAILED','UNCERTAIN')) AS failed,
  (SELECT count(*) FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status='PENDING') AS pending,
  (SELECT count(*) FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status='CLAIMED') AS claimed
  FROM communication_campaigns c JOIN admins a ON a.id=c.created_by_admin_id`;

export const postgresCommunicationRepository = {
  async audienceSummary(audience: CommunicationAudience) {
    const { sql, values } = audienceSql(audience, true);
    const result = await db().query<AudienceDirectoryRow>(sql, values);
    return summarizeAudienceDirectory(result.rows, audience.purpose);
  },
  async recipients(
    audience: CommunicationAudience,
  ): Promise<CommunicationRecipient[]> {
    const { sql, values } = audienceSql(audience);
    const result = await db().query<CommunicationRecipient>(sql, values);
    if (result.rows.length > 5000)
      throw new Error("Audience exceeds the 5,000-record resolution limit");
    return normalizeRecipients(result.rows);
  },

  async create(
    content: CommunicationContent,
    adminId: string,
    executor?: DatabaseExecutor,
  ): Promise<CommunicationCampaign> {
    const id = randomUUID();
    const reference = `AIAIAC-COM-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    await db(executor).query(
      `INSERT INTO communication_campaigns
      (id,reference,title,subject,preheader,heading,body,cta_label,cta_url,audience,created_by_admin_id,purpose)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)`,
      [
        id,
        reference,
        content.title,
        content.subject,
        content.preheader,
        content.heading,
        content.body,
        content.ctaLabel ?? null,
        content.ctaUrl ?? null,
        JSON.stringify(content.audience),
        adminId,
        content.purpose ?? "MARKETING",
      ],
    );
    return (await this.get(reference, executor))!;
  },

  async update(
    reference: string,
    content: CommunicationContent,
    executor?: DatabaseExecutor,
  ): Promise<CommunicationCampaign | null> {
    const result = await db(executor).query(
      `UPDATE communication_campaigns SET
      title=$2,subject=$3,preheader=$4,heading=$5,body=$6,cta_label=$7,cta_url=$8,audience=$9::jsonb,purpose=$10,revision=revision+1,updated_at=now()
      WHERE reference=$1 AND status='DRAFT' RETURNING id`,
      [
        reference,
        content.title,
        content.subject,
        content.preheader,
        content.heading,
        content.body,
        content.ctaLabel ?? null,
        content.ctaUrl ?? null,
        JSON.stringify(content.audience),
        content.purpose ?? "MARKETING",
      ],
    );
    return result.rowCount ? this.get(reference, executor) : null;
  },

  async get(
    reference: string,
    executor?: DatabaseExecutor,
  ): Promise<CommunicationCampaign | null> {
    const result = await db(executor).query(
      `${campaignSelect} WHERE c.reference=$1`,
      [reference],
    );
    return result.rows[0] ? mapCampaign(result.rows[0]) : null;
  },

  async list(
    page: number,
    status?: string,
  ): Promise<{ items: CommunicationCampaign[]; total: number }> {
    const where = status ? "WHERE c.status=$1" : "";
    const values = status ? [status] : [];
    const result = await db().query(
      `${campaignSelect} ${where} ORDER BY c.created_at DESC LIMIT 20 OFFSET ${status ? "$2" : "$1"}`,
      [...values, (page - 1) * 20],
    );
    const count = await db().query(
      `SELECT count(*)::int AS total FROM communication_campaigns c ${where}`,
      values,
    );
    return { items: result.rows.map(mapCampaign), total: count.rows[0].total };
  },

  async confirm(
    reference: string,
    recipients: readonly CommunicationRecipient[],
    onConfirmed?: (executor: DatabaseExecutor) => Promise<void>,
    schedule?: Date,
    revision?: number,
    adminId?: string,
  ): Promise<boolean> {
    return withTransaction(async (client) => {
      const locked = await client.query(
        "SELECT id FROM communication_campaigns WHERE reference=$1 AND status='DRAFT' AND ($2::int IS NULL OR revision=$2) FOR UPDATE",
        [reference, revision ?? null],
      );
      if (!locked.rows[0]) return false;
      const id: string = locked.rows[0].id;
      for (const recipient of recipients) {
        await client.query(
          `INSERT INTO communication_deliveries
          (id,campaign_id,recipient_email,recipient_name,source_category) VALUES ($1,$2,$3,$4,$5)`,
          [
            randomUUID(),
            id,
            recipient.email,
            recipient.name,
            recipient.sourceCategory,
          ],
        );
      }
      await client.query(
        "UPDATE communication_campaigns SET status=$3,scheduled_at=$4,confirmed_by_admin_id=$5,recipient_count=$2,updated_at=now() WHERE id=$1",
        [
          id,
          recipients.length,
          schedule ? "SCHEDULED" : "SENDING",
          schedule ?? null,
          adminId ?? null,
        ],
      );
      if (onConfirmed) await onConfirmed(client);
      return true;
    });
  },

  async claim(
    reference: string,
    retry: boolean,
  ): Promise<CommunicationDelivery[]> {
    return withTransaction(async (client) => {
      const campaign = await client.query(
        "SELECT id FROM communication_campaigns WHERE reference=$1 AND status IN ('SENDING','PARTIALLY_FAILED','FAILED') FOR UPDATE",
        [reference],
      );
      if (!campaign.rows[0]) return [];
      const id: string = campaign.rows[0].id;
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('aiaiac-communication-send-budget'))",
      );
      await client.query(
        "DELETE FROM communication_send_windows WHERE bucket<now()-interval '1 day'",
      );
      const budget = await client.query(
        "SELECT used FROM communication_send_windows WHERE bucket=date_trunc('minute',now())",
      );
      const allowance = Math.min(10, 30 - Number(budget.rows[0]?.used ?? 0));
      if (allowance <= 0) return [];
      const statuses = retry ? "('PENDING','FAILED')" : "('PENDING')";
      const rows = await client.query(
        `SELECT * FROM communication_deliveries WHERE campaign_id=$1 AND status IN ${statuses} AND attempts<3 ORDER BY created_at,id LIMIT $2 FOR UPDATE SKIP LOCKED`,
        [id, allowance],
      );
      await client.query(
        `INSERT INTO communication_send_windows(bucket,used) VALUES(date_trunc('minute',now()),$1)
        ON CONFLICT(bucket) DO UPDATE SET used=communication_send_windows.used+$1`,
        [rows.rows.length],
      );
      const deliveries: CommunicationDelivery[] = [];
      for (const row of rows.rows) {
        await client.query(
          "UPDATE communication_deliveries SET status='CLAIMED',attempts=attempts+1,claimed_at=now(),updated_at=now() WHERE id=$1",
          [row.id],
        );
        deliveries.push({
          id: row.id,
          campaignId: id,
          email: row.recipient_email,
          name: row.recipient_name,
          sourceCategory: row.source_category,
          status: "CLAIMED",
          attempts: row.attempts + 1,
          providerMessageId: row.provider_message_id,
          errorSummary: row.error_summary,
          sentAt: row.sent_at,
        });
      }
      return deliveries;
    });
  },

  async isEligible(campaign: CommunicationCampaign, email: string) {
    const eligible = await this.recipients({
      ...campaign.audience,
      purpose: campaign.purpose ?? "MARKETING",
    });
    return eligible.some((row) => row.email === email);
  },
  async resolveSkipped(id: string, uncertain = false) {
    await db().query(
      "UPDATE communication_deliveries SET status=$2,error_summary=$3,updated_at=now() WHERE id=$1 AND status='CLAIMED'",
      [
        id,
        uncertain ? "UNCERTAIN" : "SKIPPED",
        uncertain
          ? "Provider outcome unknown; manual review required"
          : "Recipient no longer eligible",
      ],
    );
  },
  async due() {
    // Claims with an unknown provider outcome are never retried automatically.
    await db().query(
      "UPDATE communication_deliveries SET status='UNCERTAIN',error_summary='Interrupted send; manual review required',updated_at=now() WHERE status='CLAIMED' AND claimed_at<now()-interval '15 minutes'",
    );
    await db().query(
      "UPDATE communication_campaigns SET status='SENDING',updated_at=now() WHERE status='SCHEDULED' AND scheduled_at<=now()",
    );
    const rows = await db().query(
      "SELECT reference,confirmed_by_admin_id AS admin FROM communication_campaigns WHERE status='SENDING' ORDER BY updated_at LIMIT 20",
    );
    return rows.rows as Array<{ reference: string; admin: string }>;
  },
  async cancel(
    reference: string,
    audit: (
      campaign: { id: string; reference: string },
      executor: DatabaseExecutor,
    ) => Promise<void>,
  ) {
    return withTransaction(async (client) => {
      const rows = await client.query(
        "UPDATE communication_campaigns SET status='CANCELLED',updated_at=now() WHERE reference=$1 AND status='SCHEDULED' RETURNING id,reference",
        [reference],
      );
      if (!rows.rows[0]) return false;
      await audit(rows.rows[0], client);
      return true;
    });
  },
  async settle(
    id: string,
    accepted: boolean,
    providerMessageId: string | null,
    errorSummary: string | null,
    providerMessageUuid?: string | null,
  ): Promise<void> {
    await db().query(
      `UPDATE communication_deliveries SET status=$2::varchar,provider_message_id=$3,error_summary=$4,provider_message_uuid=$5,
      sent_at=CASE WHEN $2::varchar='SENT' THEN now() ELSE NULL END,provider_status=CASE WHEN $2::varchar='SENT' THEN coalesce(provider_status,'ACCEPTED') ELSE provider_status END,updated_at=now()
      WHERE id=$1 AND status='CLAIMED'`,
      [
        id,
        accepted ? "SENT" : "FAILED",
        providerMessageId,
        errorSummary,
        providerMessageUuid ?? null,
      ],
    );
  },

  async refreshStatus(
    reference: string,
  ): Promise<CommunicationCampaign | null> {
    await db().query(
      `UPDATE communication_campaigns c SET status=CASE
      WHEN EXISTS (SELECT 1 FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status IN ('PENDING','CLAIMED')) THEN 'SENDING'
      WHEN EXISTS (SELECT 1 FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status IN ('FAILED','UNCERTAIN'))
        THEN CASE WHEN EXISTS (SELECT 1 FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status='SENT') THEN 'PARTIALLY_FAILED' ELSE 'FAILED' END
      ELSE 'SENT' END,
      sent_at=CASE WHEN c.sent_at IS NULL AND NOT EXISTS (SELECT 1 FROM communication_deliveries d WHERE d.campaign_id=c.id AND d.status IN ('PENDING','CLAIMED')) THEN now() ELSE c.sent_at END,
      updated_at=now() WHERE c.reference=$1 AND c.status NOT IN ('DRAFT','SCHEDULED','CANCELLED')`,
      [reference],
    );
    return this.get(reference);
  },

  async deliveries(
    page: number,
    status?: string,
    campaign?: string,
  ): Promise<{ items: CommunicationDelivery[]; total: number }> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (status) {
      values.push(status);
      clauses.push(`d.status=$${values.length}`);
    }
    if (campaign) {
      values.push(campaign);
      clauses.push(`c.reference=$${values.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const from =
      "FROM communication_deliveries d JOIN communication_campaigns c ON c.id=d.campaign_id";
    const count = await db().query(
      `SELECT count(*)::int AS total ${from} ${where}`,
      values,
    );
    values.push((page - 1) * 20);
    const result = await db().query(
      `SELECT d.*,c.reference AS campaign_reference ${from} ${where} ORDER BY d.created_at DESC,d.id LIMIT 20 OFFSET $${values.length}`,
      values,
    );
    return {
      total: count.rows[0].total,
      items: result.rows.map((row) => ({
        id: row.id,
        campaignId: row.campaign_id,
        campaignReference: row.campaign_reference,
        email: row.recipient_email,
        name: row.recipient_name,
        sourceCategory: row.source_category,
        status: row.status,
        attempts: row.attempts,
        providerStatus: row.provider_status,
        providerMessageId: row.provider_message_id,
        errorSummary: row.error_summary,
        sentAt: row.sent_at,
      })),
    };
  },
};
