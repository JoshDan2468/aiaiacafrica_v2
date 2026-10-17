import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import type {
  PaymentRecoveryNotificationClaim,
  RegistrationNotificationClaim,
  RegistrationRecoveryRecipient,
  RegistrationRecoveryWorkspace,
} from "../types/registrationRecovery";

interface WorkspaceRow extends QueryResultRow {
  reference: string;
  delegate_name: string;
  package_type_snapshot: "PROFESSIONAL" | "STUDENT";
  email_verification_status: "UNVERIFIED" | "VERIFIED";
  payment_status: RegistrationRecoveryWorkspace["paymentStatus"];
  latest_payment_status: RegistrationRecoveryWorkspace["latestPaymentStatus"];
  student_verification_status: RegistrationRecoveryWorkspace["studentVerificationStatus"];
  event_pass_status: RegistrationRecoveryWorkspace["eventPassStatus"];
  available_prices: Array<{ currency: "USD" | "NGN"; amountMinor: number }>;
}

export interface RegistrationRecoveryRepository {
  issue(
    email: string,
    recoveryTokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<RegistrationRecoveryRecipient | null>;
  exchange(
    recoveryTokenHash: string,
    continuationTokenHash: string,
    continuationExpiresAt: Date,
    now: Date,
  ): Promise<RegistrationRecoveryWorkspace | null>;
  authorize(
    continuationTokenHash: string,
    now: Date,
  ): Promise<RegistrationRecoveryWorkspace | null>;
  findLatestPaymentReference(registrationReference: string): Promise<string | null>;
  issueContinuation(
    registrationReference: string,
    continuationTokenHash: string,
    continuationExpiresAt: Date,
    now: Date,
  ): Promise<RegistrationRecoveryWorkspace | null>;
  claimPaymentRecoveryNotification(
    paymentReference: string,
    recoveryTokenHash: string,
    recoveryExpiresAt: Date,
    now: Date,
  ): Promise<PaymentRecoveryNotificationClaim | null>;
  recordPaymentRecoveryNotificationResult(
    notificationId: string,
    sent: boolean,
    now: Date,
  ): Promise<void>;
  claimNotifications(
    registrationReference: string,
    roles: readonly string[],
    now: Date,
  ): Promise<RegistrationNotificationClaim[]>;
  recordNotificationResult(id: string, sent: boolean, now: Date): Promise<void>;
}

function database() {
  const pool = getDatabasePool();
  if (!pool) throw new Error("Database is not configured");
  return pool;
}

const workspaceSelect = `
  SELECT dr.reference, concat_ws(' ',dr.first_name,dr.last_name) AS delegate_name,
         dr.package_type_snapshot, dr.email_verification_status,
         dr.payment_status, latest_payment.status AS latest_payment_status,
         sv.status AS student_verification_status,
         event_pass.status AS event_pass_status,
         COALESCE(prices.available_prices, '[]'::jsonb) AS available_prices
  FROM delegate_registrations dr
  LEFT JOIN student_verifications sv ON sv.registration_id=dr.id
  LEFT JOIN LATERAL (
    SELECT pt.status
    FROM payment_transactions pt
    WHERE pt.registration_id=dr.id
    ORDER BY pt.created_at DESC,pt.id DESC LIMIT 1
  ) latest_payment ON true
  LEFT JOIN LATERAL (
    SELECT dep.status
    FROM delegate_event_passes dep
    WHERE dep.registration_id=dr.id
    ORDER BY CASE dep.status WHEN 'ACTIVE' THEN 0 ELSE 1 END,dep.issued_at DESC LIMIT 1
  ) event_pass ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object('currency', dpp.currency, 'amountMinor', dpp.amount_minor)
      ORDER BY CASE dpp.currency WHEN 'USD' THEN 0 ELSE 1 END
    ) AS available_prices
    FROM delegate_package_prices dpp
    WHERE dpp.package_id=dr.package_id AND dpp.is_active=true
  ) prices ON true`;

function mapWorkspace(row: WorkspaceRow): RegistrationRecoveryWorkspace {
  return {
    delegateName: row.delegate_name,
    registrationReference: row.reference,
    delegateType: row.package_type_snapshot,
    emailVerificationStatus: row.email_verification_status,
    paymentStatus: row.payment_status,
    latestPaymentStatus: row.latest_payment_status,
    studentVerificationStatus: row.student_verification_status,
    eventPassStatus: row.event_pass_status,
    availablePrices: row.available_prices,
  };
}

export const postgresRegistrationRecoveryRepository: RegistrationRecoveryRepository = {
  async issue(email, recoveryTokenHash, expiresAt, now) {
    return withTransaction(async (client) => {
      const result = await client.query<{
        id: string;
        reference: string;
        email: string;
        full_name: string;
      }>(
        `SELECT id,reference,email,concat_ws(' ',first_name,last_name) AS full_name
         FROM delegate_registrations
         WHERE email=$1 AND registration_status NOT IN ('REJECTED','CANCELLED')
         ORDER BY submitted_at DESC,id DESC LIMIT 1 FOR UPDATE`,
        [email],
      );
      const row = result.rows[0];
      if (!row) return null;
      await client.query(
        `INSERT INTO delegate_registration_recovery (
           registration_id,recovery_token_hash,recovery_expires_at,recovery_consumed_at,
           continuation_token_hash,continuation_expires_at,request_count,created_at,updated_at
         ) VALUES ($1,$2,$3,NULL,NULL,NULL,1,$4,$4)
         ON CONFLICT (registration_id) DO UPDATE SET
           recovery_token_hash=EXCLUDED.recovery_token_hash,
           recovery_expires_at=EXCLUDED.recovery_expires_at,
           recovery_consumed_at=NULL,continuation_token_hash=NULL,
           continuation_expires_at=NULL,
           request_count=delegate_registration_recovery.request_count+1,
           updated_at=EXCLUDED.updated_at`,
        [row.id, recoveryTokenHash, expiresAt, now],
      );
      return {
        registrationId: row.id,
        registrationReference: row.reference,
        email: row.email,
        fullName: row.full_name,
      };
    });
  },

  async exchange(recoveryTokenHash, continuationTokenHash, continuationExpiresAt, now) {
    return withTransaction(async (client) => {
      const result = await client.query<{ registration_id: string }>(
        `UPDATE delegate_registration_recovery
         SET recovery_consumed_at=$2,continuation_token_hash=$3,
             continuation_expires_at=$4,updated_at=$2
         WHERE recovery_token_hash=$1 AND recovery_consumed_at IS NULL
           AND recovery_expires_at>$2
         RETURNING registration_id`,
        [recoveryTokenHash, now, continuationTokenHash, continuationExpiresAt],
      );
      const row = result.rows[0];
      if (!row) return null;
      const workspace = await client.query<WorkspaceRow>(
        `${workspaceSelect} WHERE dr.id=$1`,
        [row.registration_id],
      );
      return workspace.rows[0] ? mapWorkspace(workspace.rows[0]) : null;
    });
  },

  async authorize(continuationTokenHash, now) {
    const result = await database().query<WorkspaceRow>(
      `${workspaceSelect}
       JOIN delegate_registration_recovery drr ON drr.registration_id=dr.id
       WHERE drr.continuation_token_hash=$1 AND drr.continuation_expires_at>$2`,
      [continuationTokenHash, now],
    );
    return result.rows[0] ? mapWorkspace(result.rows[0]) : null;
  },

  async findLatestPaymentReference(registrationReference) {
    const result = await database().query<{ provider_reference: string }>(
      `SELECT pt.provider_reference
       FROM payment_transactions pt
       JOIN delegate_registrations dr ON dr.id=pt.registration_id
       WHERE dr.reference=$1 AND pt.provider='PAYSTACK'
       ORDER BY pt.created_at DESC,pt.id DESC LIMIT 1`,
      [registrationReference],
    );
    return result.rows[0]?.provider_reference ?? null;
  },

  async issueContinuation(
    registrationReference,
    continuationTokenHash,
    continuationExpiresAt,
    now,
  ) {
    return withTransaction(async (client) => {
      const issued = await client.query<{ registration_id: string }>(
        `INSERT INTO delegate_registration_recovery (
           registration_id,recovery_token_hash,recovery_expires_at,recovery_consumed_at,
           continuation_token_hash,continuation_expires_at,request_count,created_at,updated_at
         )
         SELECT dr.id,NULL,NULL,NULL,$2,$3,0,$4,$4
         FROM delegate_registrations dr
         WHERE dr.reference=$1 AND dr.registration_status NOT IN ('REJECTED','CANCELLED')
         ON CONFLICT (registration_id) DO UPDATE SET
           recovery_token_hash=NULL,recovery_expires_at=NULL,recovery_consumed_at=NULL,
           continuation_token_hash=EXCLUDED.continuation_token_hash,
           continuation_expires_at=EXCLUDED.continuation_expires_at,
           updated_at=EXCLUDED.updated_at
         RETURNING registration_id`,
        [registrationReference, continuationTokenHash, continuationExpiresAt, now],
      );
      const registrationId = issued.rows[0]?.registration_id;
      if (!registrationId) return null;
      const workspace = await client.query<WorkspaceRow>(
        `${workspaceSelect} WHERE dr.id=$1`,
        [registrationId],
      );
      return workspace.rows[0] ? mapWorkspace(workspace.rows[0]) : null;
    });
  },

  async claimPaymentRecoveryNotification(
    paymentReference,
    recoveryTokenHash,
    recoveryExpiresAt,
    now,
  ) {
    return withTransaction(async (client) => {
      const eligible = await client.query<{
        payment_id: string;
        registration_id: string;
        reference: string;
        email: string;
        full_name: string;
        delegate_type: "PROFESSIONAL" | "STUDENT";
        payment_status: "FAILED" | "ABANDONED";
      }>(
        `SELECT pt.id AS payment_id,dr.id AS registration_id,dr.reference,dr.email,
                concat_ws(' ',dr.first_name,dr.last_name) AS full_name,
                dr.package_type_snapshot AS delegate_type,pt.status AS payment_status
         FROM payment_transactions pt
         JOIN delegate_registrations dr ON dr.id=pt.registration_id
         WHERE pt.provider_reference=$1
           AND pt.status IN ('FAILED','ABANDONED')
           AND pt.financial_authority='UNRESOLVED'
           AND dr.payment_status<>'PAID'
           AND dr.authoritative_payment_transaction_id IS NULL
         FOR UPDATE OF pt,dr`,
        [paymentReference],
      );
      const recipient = eligible.rows[0];
      if (!recipient) return null;
      const notificationId = randomUUID();
      const claimed = await client.query<{ id: string }>(
        `INSERT INTO payment_recovery_notifications (
           id,payment_transaction_id,registration_id,recipient_email_snapshot,
           recipient_name_snapshot,delegate_type_snapshot,payment_status_snapshot,
           status,attempts,last_attempt_at,created_at,updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',1,$8,$8,$8)
         ON CONFLICT (payment_transaction_id) DO UPDATE SET
           status='PENDING',attempts=payment_recovery_notifications.attempts+1,
           last_attempt_at=EXCLUDED.last_attempt_at,updated_at=EXCLUDED.updated_at
         WHERE payment_recovery_notifications.status='FAILED'
           AND payment_recovery_notifications.attempts<3
         RETURNING id`,
        [
          notificationId,
          recipient.payment_id,
          recipient.registration_id,
          recipient.email,
          recipient.full_name,
          recipient.delegate_type,
          recipient.payment_status,
          now,
        ],
      );
      const claimedId = claimed.rows[0]?.id;
      if (!claimedId) return null;
      await client.query(
        `INSERT INTO delegate_registration_recovery (
           registration_id,recovery_token_hash,recovery_expires_at,recovery_consumed_at,
           continuation_token_hash,continuation_expires_at,request_count,created_at,updated_at
         ) VALUES ($1,$2,$3,NULL,NULL,NULL,1,$4,$4)
         ON CONFLICT (registration_id) DO UPDATE SET
           recovery_token_hash=EXCLUDED.recovery_token_hash,
           recovery_expires_at=EXCLUDED.recovery_expires_at,
           recovery_consumed_at=NULL,continuation_token_hash=NULL,
           continuation_expires_at=NULL,
           request_count=delegate_registration_recovery.request_count+1,
           updated_at=EXCLUDED.updated_at`,
        [recipient.registration_id, recoveryTokenHash, recoveryExpiresAt, now],
      );
      return {
        notificationId: claimedId,
        registrationId: recipient.registration_id,
        registrationReference: recipient.reference,
        email: recipient.email,
        fullName: recipient.full_name,
        delegateType: recipient.delegate_type,
        paymentStatus: recipient.payment_status,
      };
    });
  },

  async recordPaymentRecoveryNotificationResult(notificationId, sent, now) {
    await database().query(
      `UPDATE payment_recovery_notifications
       SET status=$2::varchar,
           sent_at=CASE WHEN $2::varchar='SENT' THEN $3::timestamptz ELSE NULL END,
           updated_at=$3::timestamptz
       WHERE id=$1 AND status='PENDING'`,
      [notificationId, sent ? "SENT" : "FAILED", now],
    );
  },

  async claimNotifications(registrationReference, roles, now) {
    if (!roles.length) return [];
    return withTransaction(async (client) => {
      const registration = await client.query<{ id: string }>(
        "SELECT id FROM delegate_registrations WHERE reference=$1",
        [registrationReference],
      );
      const registrationId = registration.rows[0]?.id;
      if (!registrationId) return [];
      const recipients = await client.query<{
        id: string;
        email: string;
        full_name: string;
      }>(
        `SELECT id,email,full_name FROM admins
         WHERE is_active=true AND role=ANY($1::varchar[]) ORDER BY id`,
        [roles],
      );
      for (const recipient of recipients.rows) {
        await client.query(
          `INSERT INTO delegate_registration_admin_notifications (
             id,registration_id,admin_id,recipient_email_snapshot,recipient_name_snapshot
           ) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (registration_id,admin_id) DO NOTHING`,
          [randomUUID(), registrationId, recipient.id, recipient.email, recipient.full_name],
        );
      }
      const stale = new Date(now.getTime() - 10 * 60_000);
      const claims = await client.query<
        QueryResultRow & {
          id: string;
          recipient_email_snapshot: string;
          recipient_name_snapshot: string;
          reference: string;
          delegate_name: string;
          package_type_snapshot: "PROFESSIONAL" | "STUDENT";
          company_name: string;
          country: string;
          submitted_at: Date;
        }
      >(
        `SELECT n.id,n.recipient_email_snapshot,n.recipient_name_snapshot,
                dr.reference,concat_ws(' ',dr.first_name,dr.last_name) AS delegate_name,
                dr.package_type_snapshot,dr.company_name,dr.country,dr.submitted_at
         FROM delegate_registration_admin_notifications n
         JOIN delegate_registrations dr ON dr.id=n.registration_id
         JOIN admins a ON a.id=n.admin_id AND a.is_active=true
           AND a.role=ANY($3::varchar[]) AND a.email=n.recipient_email_snapshot
         WHERE n.registration_id=$1 AND n.attempts<3 AND (
           n.status IN ('NOT_QUEUED','FAILED') OR
           (n.status='PENDING' AND (n.last_attempt_at IS NULL OR n.last_attempt_at<=$2))
         ) ORDER BY n.created_at FOR UPDATE OF n`,
        [registrationId, stale, roles],
      );
      if (!claims.rowCount) return [];
      await client.query(
        `UPDATE delegate_registration_admin_notifications
         SET status='PENDING',attempts=attempts+1,last_attempt_at=$2,updated_at=$2
         WHERE id=ANY($1::uuid[])`,
        [claims.rows.map((row) => row.id), now],
      );
      return claims.rows.map((row) => ({
        id: row.id,
        email: row.recipient_email_snapshot,
        fullName: row.recipient_name_snapshot,
        registrationReference: row.reference,
        delegateName: row.delegate_name,
        delegateType: row.package_type_snapshot,
        companyName: row.company_name,
        country: row.country,
        submittedAt: row.submitted_at,
      }));
    });
  },

  async recordNotificationResult(id, sent, now) {
    await database().query(
      `UPDATE delegate_registration_admin_notifications
       SET status=$2::varchar,
           sent_at=CASE WHEN $2::varchar='SENT' THEN $3::timestamptz ELSE NULL END,
           updated_at=$3::timestamptz
       WHERE id=$1 AND status='PENDING'`,
      [id, sent ? "SENT" : "FAILED", now],
    );
  },
};
