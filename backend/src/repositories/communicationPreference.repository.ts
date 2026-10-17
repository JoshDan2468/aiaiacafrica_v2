import { randomUUID } from "node:crypto";
import { getDatabasePool, withTransaction } from "../config/database";
import { roleHasPermission } from "../config/permissions";
import type { AdminRole } from "../types/admin";
import type { DatabaseExecutor } from "../types/database";
import type { z } from "zod";
import { preferenceSchema } from "../services/communicationSafety";
const db = (executor?: DatabaseExecutor) => {
  const pool = executor ?? getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
};
export const communicationPreferences = {
  async list(page = 1, suppressedOnly = false) {
    const where = suppressedOnly
      ? "WHERE suppressed=true OR consent='OPTED_OUT'"
      : "";
    const rows = await db().query(
      `SELECT id,email,consent,evidence,source_label AS "sourceLabel",suppressed,suppression_reason AS reason,updated_at AS "updatedAt" FROM communication_preferences ${where} ORDER BY updated_at DESC,email LIMIT 25 OFFSET $1`,
      [(page - 1) * 25],
    );
    const count = await db().query(
      `SELECT count(*)::int AS total FROM communication_preferences ${where}`,
    );
    return { items: rows.rows, total: count.rows[0].total };
  },
  async set(
    input: z.infer<typeof preferenceSchema>,
    adminId: string,
    audit: (id: string, executor: DatabaseExecutor) => Promise<void>,
  ) {
    return withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO communication_preferences(id,email,consent,evidence,source_label,suppressed,suppression_reason,updated_by_admin_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(email) DO UPDATE SET
        consent=coalesce($9,communication_preferences.consent), evidence=coalesce($4,communication_preferences.evidence),
        source_label=coalesce($5,communication_preferences.source_label), suppressed=coalesce($10,communication_preferences.suppressed),
        suppression_reason=coalesce($7,communication_preferences.suppression_reason),updated_by_admin_id=$8,updated_at=now() RETURNING id`,
        [
          randomUUID(),
          input.email,
          input.consent ?? "UNKNOWN",
          input.evidence ?? null,
          input.sourceLabel ?? null,
          input.suppressed ?? false,
          input.reason ?? null,
          adminId,
          input.consent ?? null,
          input.suppressed ?? null,
        ],
      );
      await audit(result.rows[0].id, client);
      return { updated: true };
    });
  },
  async unsubscribe(email: string, campaign: string) {
    await db().query(
      `INSERT INTO communication_preferences(id,email,consent,suppressed,suppression_reason,source_label)
      SELECT $1::uuid,$2::varchar,'OPTED_OUT',true,'Unsubscribed','Campaign unsubscribe' WHERE EXISTS
      (SELECT 1 FROM communication_deliveries d JOIN communication_campaigns c ON c.id=d.campaign_id WHERE c.reference=$3::varchar AND d.recipient_email=$2::varchar)
      ON CONFLICT(email) DO UPDATE SET consent='OPTED_OUT',suppressed=true,suppression_reason='Unsubscribed',updated_at=now()`,
      [randomUUID(), email, campaign],
    );
  },
  async canDispatch(adminId: string): Promise<boolean> {
    const rows = await db().query<{ role: AdminRole }>(
      "SELECT role FROM admins WHERE id=$1 AND is_active=true",
      [adminId],
    );
    return (
      !!rows.rows[0] &&
      roleHasPermission(rows.rows[0].role, "communications.send")
    );
  },
  async providerEvent(messageId: string, event: string, deliveryId?: string) {
    return withTransaction(async (client) => {
      const rows = await client.query(
        `UPDATE communication_deliveries SET provider_status=$2,updated_at=now()
        WHERE (provider_message_uuid=$1::uuid OR id=$3::uuid) AND (
        provider_status IS NULL OR provider_status='ACCEPTED' OR
        ($2 IN ('OPENED','CLICKED') AND provider_status='DELIVERED') OR
        ($2='CLICKED' AND provider_status='OPENED') OR $2 IN ('BOUNCED','BLOCKED','SPAM','UNSUBSCRIBED')) RETURNING recipient_email`,
        [messageId, event, deliveryId ?? null],
      );
      if (["BOUNCED", "BLOCKED", "SPAM", "UNSUBSCRIBED"].includes(event))
        for (const row of rows.rows)
          await client.query(
            `INSERT INTO communication_preferences(id,email,suppressed,suppression_reason,consent)
        VALUES($1,$2,true,$3::varchar,CASE WHEN $3::varchar='UNSUBSCRIBED' THEN 'OPTED_OUT' ELSE 'UNKNOWN' END) ON CONFLICT(email) DO UPDATE SET suppressed=true,suppression_reason=$3,consent=CASE WHEN $3::varchar='UNSUBSCRIBED' THEN 'OPTED_OUT' ELSE communication_preferences.consent END,updated_at=now()`,
            [randomUUID(), row.recipient_email, event],
          );
    });
  },
};
