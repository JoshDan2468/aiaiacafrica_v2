import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns("payment_transactions", {
    provider_status: { type: "varchar(32)" },
    financial_authority: {
      type: "varchar(24)",
      notNull: true,
      default: "UNRESOLVED",
    },
    reconciliation_reason: { type: "varchar(80)" },
    reconciliation_attempts: { type: "integer", notNull: true, default: 0 },
    reconciliation_last_attempt_at: { type: "timestamptz" },
  });
  pgm.addColumns("delegate_registrations", {
    authoritative_payment_transaction_id: { type: "uuid" },
  });
  pgm.dropConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_payment_admin_unique",
  );
  pgm.addColumns("payment_admin_notifications", {
    notification_type: {
      type: "varchar(32)",
      notNull: true,
      default: "PAYMENT_CONFIRMED",
    },
  });
  pgm.addConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_type_allowed",
    {
      check:
        "notification_type IN ('PAYMENT_CONFIRMED', 'RECONCILIATION_REQUIRED')",
    },
  );
  pgm.addConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_payment_admin_type_unique",
    { unique: ["payment_transaction_id", "admin_id", "notification_type"] },
  );

  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_status_allowed",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_status_allowed",
    {
      check:
        "status IN ('INITIALIZED', 'PENDING', 'PAID', 'FAILED', 'ABANDONED', 'REVERSED', 'DUPLICATE_SUCCESS', 'RECONCILIATION_REQUIRED')",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_financial_authority_allowed",
    {
      check:
        "financial_authority IN ('UNRESOLVED', 'AUTHORITATIVE', 'NON_AUTHORITATIVE')",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_reconciliation_attempts_nonnegative",
    { check: "reconciliation_attempts >= 0" },
  );

  pgm.sql(`
    WITH ranked_paid AS (
      SELECT id,
             row_number() OVER (
               PARTITION BY registration_id
               ORDER BY paid_at NULLS LAST, verified_at NULLS LAST, created_at, id
             ) AS success_rank
      FROM payment_transactions
      WHERE status = 'PAID'
    )
    UPDATE payment_transactions pt
       SET status = CASE WHEN rp.success_rank = 1 THEN 'PAID' ELSE 'DUPLICATE_SUCCESS' END,
           financial_authority = CASE
             WHEN rp.success_rank = 1 THEN 'AUTHORITATIVE'
             ELSE 'NON_AUTHORITATIVE'
           END,
           provider_status = 'success',
           reconciliation_reason = CASE
             WHEN rp.success_rank = 1 THEN NULL
             ELSE 'DUPLICATE_SUCCESS_REQUIRES_RECONCILIATION'
           END,
           confirmation_email_status = CASE
             WHEN rp.success_rank = 1 THEN confirmation_email_status
             ELSE 'NOT_QUEUED'
           END,
           updated_at = current_timestamp
      FROM ranked_paid rp
     WHERE pt.id = rp.id;

    UPDATE delegate_registrations dr
       SET authoritative_payment_transaction_id = (
             SELECT pt.id
               FROM payment_transactions pt
              WHERE pt.registration_id = dr.id
                AND pt.financial_authority = 'AUTHORITATIVE'
              ORDER BY pt.paid_at NULLS LAST, pt.created_at, pt.id
              LIMIT 1
           ),
           updated_at = current_timestamp
     WHERE EXISTS (
       SELECT 1 FROM payment_transactions pt
        WHERE pt.registration_id = dr.id
          AND pt.financial_authority = 'AUTHORITATIVE'
     );

    ALTER TABLE payment_transactions
      ADD CONSTRAINT payment_transactions_financial_state_consistent
      CHECK (
        (financial_authority = 'UNRESOLVED' AND
          status IN ('INITIALIZED', 'PENDING', 'FAILED', 'ABANDONED', 'REVERSED'))
        OR
        (financial_authority = 'AUTHORITATIVE' AND
          status IN ('PAID', 'RECONCILIATION_REQUIRED', 'REVERSED'))
        OR
        (financial_authority = 'NON_AUTHORITATIVE' AND
          status IN ('DUPLICATE_SUCCESS', 'RECONCILIATION_REQUIRED', 'REVERSED'))
      );

    CREATE UNIQUE INDEX "IDX_payment_transactions_one_authoritative_registration"
      ON payment_transactions (registration_id)
      WHERE financial_authority = 'AUTHORITATIVE';

    CREATE UNIQUE INDEX "IDX_payment_transactions_id_registration"
      ON payment_transactions (id, registration_id);

    ALTER TABLE delegate_registrations
      ADD CONSTRAINT "delegate_registrations_authoritative_payment_belongs_to_registration"
      FOREIGN KEY (authoritative_payment_transaction_id, id)
      REFERENCES payment_transactions (id, registration_id)
      ON DELETE RESTRICT;

    CREATE INDEX "IDX_payment_transactions_reconciliation_candidates"
      ON payment_transactions (reconciliation_last_attempt_at, created_at)
      WHERE status IN ('INITIALIZED', 'PENDING', 'FAILED', 'ABANDONED')
        AND financial_authority = 'UNRESOLVED';
  `);

  pgm.dropConstraint("payment_events", "payment_events_type_allowed");
  pgm.addConstraint("payment_events", "payment_events_type_allowed", {
    check:
      "event_type IN ('PAYMENT_INITIALIZED', 'PAYMENT_CONFIRMED', 'PAYMENT_VERIFICATION_FAILED', 'PAYMENT_DUPLICATE_SUCCESS', 'PAYMENT_RECONCILIATION_ATTEMPTED', 'PAYMENT_RECONCILIATION_REQUIRED', 'PAYMENT_RECONCILIATION_RESOLVED', 'EVENT_PASS_ISSUED', 'DELEGATE_CONFIRMATION_SENT', 'DELEGATE_CONFIRMATION_FAILED', 'ADMIN_PAYMENT_NOTIFICATION_SENT', 'ADMIN_PAYMENT_NOTIFICATION_FAILED')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("payment_events", "payment_events_type_allowed");
  pgm.sql(`
    DELETE FROM payment_events
     WHERE event_type IN (
       'PAYMENT_DUPLICATE_SUCCESS',
       'PAYMENT_RECONCILIATION_ATTEMPTED',
       'PAYMENT_RECONCILIATION_REQUIRED',
       'PAYMENT_RECONCILIATION_RESOLVED'
     );
    ALTER TABLE payment_transactions
      DROP CONSTRAINT IF EXISTS payment_transactions_financial_state_consistent;
    UPDATE payment_transactions
       SET status = 'FAILED',
           failure_reason = COALESCE(reconciliation_reason, failure_reason)
     WHERE status IN ('DUPLICATE_SUCCESS', 'RECONCILIATION_REQUIRED');
    ALTER TABLE delegate_registrations
      DROP CONSTRAINT "delegate_registrations_authoritative_payment_belongs_to_registration";
    DROP INDEX "IDX_payment_transactions_reconciliation_candidates";
    DROP INDEX "IDX_payment_transactions_id_registration";
    DROP INDEX "IDX_payment_transactions_one_authoritative_registration";
  `);
  pgm.addConstraint("payment_events", "payment_events_type_allowed", {
    check:
      "event_type IN ('PAYMENT_INITIALIZED', 'PAYMENT_CONFIRMED', 'PAYMENT_VERIFICATION_FAILED', 'EVENT_PASS_ISSUED', 'DELEGATE_CONFIRMATION_SENT', 'DELEGATE_CONFIRMATION_FAILED', 'ADMIN_PAYMENT_NOTIFICATION_SENT', 'ADMIN_PAYMENT_NOTIFICATION_FAILED')",
  });
  pgm.dropColumns("delegate_registrations", [
    "authoritative_payment_transaction_id",
  ]);
  pgm.dropConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_payment_admin_type_unique",
  );
  pgm.dropConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_type_allowed",
  );
  pgm.dropColumns("payment_admin_notifications", ["notification_type"]);
  pgm.addConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_payment_admin_unique",
    { unique: ["payment_transaction_id", "admin_id"] },
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_reconciliation_attempts_nonnegative",
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_financial_authority_allowed",
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_status_allowed",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_status_allowed",
    {
      check:
        "status IN ('INITIALIZED', 'PENDING', 'PAID', 'FAILED', 'ABANDONED', 'REVERSED')",
    },
  );
  pgm.dropColumns("payment_transactions", [
    "provider_status",
    "financial_authority",
    "reconciliation_reason",
    "reconciliation_attempts",
    "reconciliation_last_attempt_at",
  ]);
}
