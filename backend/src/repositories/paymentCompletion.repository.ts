/**
 * Payment completion repository
 *
 * Claims delegate/Admin delivery work transactionally so callback, webhook,
 * and retry paths cannot issue duplicate passes or send concurrently.
 */

import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { withTransaction } from "../config/database";
import type {
  AdminNotificationClaim,
  DelegateConfirmationClaim,
  EventPassRecord,
  EventPassStatus,
  PaymentNotificationRole,
} from "../types/paymentCompletion";

const maximumDeliveryAttempts = 3;
const staleClaimMilliseconds = 10 * 60_000;

type CompletionEventType =
  | "EVENT_PASS_ISSUED"
  | "DELEGATE_CONFIRMATION_SENT"
  | "DELEGATE_CONFIRMATION_FAILED"
  | "ADMIN_PAYMENT_NOTIFICATION_SENT"
  | "ADMIN_PAYMENT_NOTIFICATION_FAILED";

interface PaymentCompletionRow extends QueryResultRow {
  id: string;
  registration_id: string;
  status: string;
}

interface EventPassRow extends QueryResultRow {
  id: string;
  registration_id: string;
  status: EventPassStatus;
  issued_at: Date;
  checked_in_at: Date | null;
  delivery_status: string;
  delivery_attempts: number;
  delivery_last_attempt_at: Date | null;
}

interface AdminNotificationRow extends QueryResultRow {
  id: string;
  recipient_email_snapshot: string;
  recipient_name_snapshot: string;
}

interface AdminRecipientRow extends QueryResultRow {
  id: string;
  email: string;
  full_name: string;
}

export interface PaymentCompletionRepository {
  claimDelegateConfirmation(
    paymentReference: string,
    credentialHash: string,
    now: Date,
  ): Promise<DelegateConfirmationClaim | null>;
  recordDelegateConfirmationResult(
    paymentReference: string,
    sent: boolean,
  ): Promise<void>;
  claimAdminNotifications(
    paymentId: string,
    roles: readonly PaymentNotificationRole[],
    now: Date,
  ): Promise<AdminNotificationClaim[]>;
  claimReconciliationNotifications(
    paymentId: string,
    roles: readonly PaymentNotificationRole[],
    now: Date,
  ): Promise<AdminNotificationClaim[]>;
  recordAdminNotificationResult(
    notificationId: string,
    sent: boolean,
  ): Promise<void>;
}

function mapEventPass(row: EventPassRow): EventPassRecord {
  return {
    id: row.id,
    registrationId: row.registration_id,
    status: row.status,
    issuedAt: row.issued_at,
    checkedInAt: row.checked_in_at,
  };
}

async function recordCompletionEvent(
  client: PoolClient,
  paymentId: string,
  eventType: CompletionEventType,
): Promise<void> {
  await client.query(
    `INSERT INTO payment_events (id, payment_transaction_id, event_type, details)
     VALUES ($1, $2, $3, '{}'::jsonb)
     ON CONFLICT (payment_transaction_id, event_type) DO NOTHING`,
    [randomUUID(), paymentId, eventType],
  );
}

export const postgresPaymentCompletionRepository: PaymentCompletionRepository =
  {
    async claimDelegateConfirmation(paymentReference, credentialHash, now) {
      return withTransaction(async (client) => {
        const paymentResult = await client.query<PaymentCompletionRow>(
          `SELECT pt.id, pt.registration_id, pt.status
         FROM payment_transactions pt
         JOIN delegate_registrations dr
           ON dr.id = pt.registration_id
          AND dr.authoritative_payment_transaction_id = pt.id
         WHERE pt.provider_reference = $1
         FOR UPDATE OF pt`,
          [paymentReference],
        );
        const payment = paymentResult.rows[0];
        if (!payment || payment.status !== "PAID") return null;

        const inserted = await client.query<EventPassRow>(
          `INSERT INTO delegate_event_passes (
           id, registration_id, credential_hash, status, issued_at
         ) VALUES ($1, $2, $3, 'ACTIVE', $4)
         ON CONFLICT (registration_id) DO NOTHING
         RETURNING id, registration_id, status, issued_at, checked_in_at,
                   delivery_status, delivery_attempts, delivery_last_attempt_at`,
          [randomUUID(), payment.registration_id, credentialHash, now],
        );
        if (inserted.rowCount) {
          await recordCompletionEvent(client, payment.id, "EVENT_PASS_ISSUED");
        }

        const passResult = await client.query<EventPassRow>(
          `SELECT id, registration_id, status, issued_at, checked_in_at,
                delivery_status, delivery_attempts, delivery_last_attempt_at
         FROM delegate_event_passes
         WHERE registration_id = $1
         FOR UPDATE`,
          [payment.registration_id],
        );
        const eventPass = passResult.rows[0];
        if (!eventPass)
          throw new Error("Event pass issuance returned no record");

        const staleBefore = new Date(now.getTime() - staleClaimMilliseconds);
        const retryable =
          eventPass.delivery_status === "NOT_QUEUED" ||
          eventPass.delivery_status === "FAILED" ||
          (eventPass.delivery_status === "PENDING" &&
            (!eventPass.delivery_last_attempt_at ||
              eventPass.delivery_last_attempt_at <= staleBefore));
        const shouldSend =
          eventPass.status === "ACTIVE" &&
          retryable &&
          eventPass.delivery_attempts < maximumDeliveryAttempts;

        if (shouldSend) {
          // A retry rotates the bearer credential while retaining the same event pass.
          await client.query(
            `UPDATE delegate_event_passes
           SET credential_hash = $2, delivery_status = 'PENDING',
               delivery_attempts = delivery_attempts + 1,
               delivery_last_attempt_at = $3, updated_at = $3
           WHERE id = $1`,
            [eventPass.id, credentialHash, now],
          );
          await client.query(
            `UPDATE payment_transactions
           SET confirmation_email_status = 'PENDING',
               updated_at = $2
           WHERE id = $1`,
            [payment.id, now],
          );
        }

        return { shouldSend, eventPass: mapEventPass(eventPass) };
      });
    },

    async recordDelegateConfirmationResult(paymentReference, sent) {
      await withTransaction(async (client) => {
        const result = await client.query<{
          id: string;
          registration_id: string;
        }>(
          `UPDATE payment_transactions
         SET confirmation_email_status = $2::varchar,
             confirmation_email_sent_at = CASE WHEN $2::varchar = 'SENT' THEN current_timestamp ELSE NULL END,
             updated_at = current_timestamp
         WHERE provider_reference = $1 AND confirmation_email_status = 'PENDING'
         RETURNING id, registration_id`,
          [paymentReference, sent ? "SENT" : "FAILED"],
        );
        const payment = result.rows[0];
        if (payment) {
          await client.query(
            `UPDATE delegate_event_passes
           SET delivery_status = $2::varchar,
               delivery_sent_at = CASE WHEN $2::varchar = 'SENT' THEN current_timestamp ELSE NULL END,
               updated_at = current_timestamp
           WHERE registration_id = $1 AND delivery_status = 'PENDING'`,
            [payment.registration_id, sent ? "SENT" : "FAILED"],
          );
          await recordCompletionEvent(
            client,
            payment.id,
            sent
              ? "DELEGATE_CONFIRMATION_SENT"
              : "DELEGATE_CONFIRMATION_FAILED",
          );
        }
      });
    },

    async claimAdminNotifications(paymentId, roles, now) {
      if (roles.length === 0) return [];
      return withTransaction(async (client) => {
        const paid = await client.query(
          `SELECT 1
           FROM payment_transactions pt
           JOIN delegate_registrations dr
             ON dr.id = pt.registration_id
            AND dr.authoritative_payment_transaction_id = pt.id
           WHERE pt.id = $1 AND pt.status = 'PAID'
           FOR UPDATE OF pt`,
          [paymentId],
        );
        if (!paid.rowCount) return [];

        const recipients = await client.query<AdminRecipientRow>(
          `SELECT id, email, full_name
         FROM admins
         WHERE is_active = true AND role = ANY($1::varchar[])
         ORDER BY id`,
          [roles],
        );
        for (const recipient of recipients.rows) {
          await client.query(
            `INSERT INTO payment_admin_notifications (
             id, payment_transaction_id, admin_id, recipient_email_snapshot,
             recipient_name_snapshot, status
           ) VALUES ($1, $2, $3, $4, $5, 'NOT_QUEUED')
           ON CONFLICT (payment_transaction_id, admin_id, notification_type) DO NOTHING`,
            [
              randomUUID(),
              paymentId,
              recipient.id,
              recipient.email,
              recipient.full_name,
            ],
          );
        }

        const staleBefore = new Date(now.getTime() - staleClaimMilliseconds);
        const eligible = await client.query<AdminNotificationRow>(
          `SELECT id, recipient_email_snapshot, recipient_name_snapshot
         FROM payment_admin_notifications
         WHERE payment_transaction_id = $1
           AND notification_type = 'PAYMENT_CONFIRMED'
           AND attempts < $2
           AND (
             status IN ('NOT_QUEUED', 'FAILED') OR
             (status = 'PENDING' AND (last_attempt_at IS NULL OR last_attempt_at <= $3))
           )
         ORDER BY created_at ASC
         FOR UPDATE`,
          [paymentId, maximumDeliveryAttempts, staleBefore],
        );
        if (!eligible.rowCount) return [];
        const ids = eligible.rows.map((row) => row.id);
        await client.query(
          `UPDATE payment_admin_notifications
         SET status = 'PENDING', attempts = attempts + 1,
             last_attempt_at = $2, updated_at = $2
         WHERE id = ANY($1::uuid[])`,
          [ids, now],
        );
        return eligible.rows.map((row) => ({
          id: row.id,
          email: row.recipient_email_snapshot,
          fullName: row.recipient_name_snapshot,
        }));
      });
    },

    async claimReconciliationNotifications(paymentId, roles, now) {
      if (roles.length === 0) return [];
      return withTransaction(async (client) => {
        const actionRequired = await client.query(
          `SELECT 1 FROM payment_transactions
           WHERE id = $1
             AND status IN ('DUPLICATE_SUCCESS', 'RECONCILIATION_REQUIRED', 'REVERSED')
           FOR UPDATE`,
          [paymentId],
        );
        if (!actionRequired.rowCount) return [];
        const recipients = await client.query<AdminRecipientRow>(
          `SELECT id, email, full_name FROM admins
           WHERE is_active = true AND role = ANY($1::varchar[])
           ORDER BY id`,
          [roles],
        );
        for (const recipient of recipients.rows) {
          await client.query(
            `INSERT INTO payment_admin_notifications (
               id, payment_transaction_id, admin_id, recipient_email_snapshot,
               recipient_name_snapshot, status, notification_type
             ) VALUES ($1, $2, $3, $4, $5, 'NOT_QUEUED', 'RECONCILIATION_REQUIRED')
             ON CONFLICT (payment_transaction_id, admin_id, notification_type) DO NOTHING`,
            [
              randomUUID(),
              paymentId,
              recipient.id,
              recipient.email,
              recipient.full_name,
            ],
          );
        }
        const staleBefore = new Date(now.getTime() - staleClaimMilliseconds);
        const eligible = await client.query<AdminNotificationRow>(
          `SELECT id, recipient_email_snapshot, recipient_name_snapshot
           FROM payment_admin_notifications
           WHERE payment_transaction_id = $1
             AND notification_type = 'RECONCILIATION_REQUIRED'
             AND attempts < $2
             AND (status IN ('NOT_QUEUED', 'FAILED') OR
                  (status = 'PENDING' AND (last_attempt_at IS NULL OR last_attempt_at <= $3)))
           ORDER BY created_at ASC
           FOR UPDATE`,
          [paymentId, maximumDeliveryAttempts, staleBefore],
        );
        if (!eligible.rowCount) return [];
        await client.query(
          `UPDATE payment_admin_notifications
           SET status = 'PENDING', attempts = attempts + 1,
               last_attempt_at = $2, updated_at = $2
           WHERE id = ANY($1::uuid[])`,
          [eligible.rows.map((row) => row.id), now],
        );
        return eligible.rows.map((row) => ({
          id: row.id,
          email: row.recipient_email_snapshot,
          fullName: row.recipient_name_snapshot,
        }));
      });
    },

    async recordAdminNotificationResult(notificationId, sent) {
      await withTransaction(async (client) => {
        const result = await client.query<{ payment_transaction_id: string }>(
          `UPDATE payment_admin_notifications
         SET status = $2::varchar,
             sent_at = CASE WHEN $2::varchar = 'SENT' THEN current_timestamp ELSE NULL END,
             updated_at = current_timestamp
         WHERE id = $1 AND status = 'PENDING'
         RETURNING payment_transaction_id`,
          [notificationId, sent ? "SENT" : "FAILED"],
        );
        const notification = result.rows[0];
        if (notification) {
          await recordCompletionEvent(
            client,
            notification.payment_transaction_id,
            sent
              ? "ADMIN_PAYMENT_NOTIFICATION_SENT"
              : "ADMIN_PAYMENT_NOTIFICATION_FAILED",
          );
        }
      });
    },
  };
