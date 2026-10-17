import type { MigrationBuilder } from "node-pg-migrate";

const previousAuditActions = [
  "USER_INVITED",
  "INVITATION_RESENT",
  "INVITATION_REVOKED",
  "INVITATION_ACCEPTED",
  "USER_ROLE_CHANGED",
  "USER_DISABLED",
  "USER_ENABLED",
  "ADMIN_LOGIN",
  "ADMIN_LOGOUT",
  "ADMIN_SESSION_EXPIRED",
  "CAMPAIGN_CREATED",
  "CAMPAIGN_UPDATED",
  "CAMPAIGN_TEST_SENT",
  "CAMPAIGN_CONFIRMED",
  "CAMPAIGN_SEND_STARTED",
  "CAMPAIGN_SEND_COMPLETED",
  "CAMPAIGN_RETRIED",
];

const manualAuditActions = [
  "MANUAL_PAYMENT_RECORDED",
  "MANUAL_PAYMENT_CONFIRMED",
  "MANUAL_PAYMENT_CONFIRMATION_FAILED",
];

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns("payment_transactions", {
    payment_source: { type: "varchar(24)", notNull: true, default: "PAYSTACK" },
    payment_method: { type: "varchar(24)", notNull: true, default: "PAYSTACK" },
    external_reference: { type: "varchar(120)" },
    payer_name: { type: "varchar(160)" },
    internal_note: { type: "varchar(1000)" },
    payment_date: { type: "timestamptz" },
    recorded_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    confirmed_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    confirmed_at: { type: "timestamptz" },
  });

  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_provider_allowed",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_provider_allowed",
    {
      check: "provider IN ('PAYSTACK', 'MANUAL')",
    },
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_reference_format",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_reference_format",
    {
      check:
        "provider_reference ~ '^AIAIAC-PAY-[A-Z0-9]{24}$' OR " +
        "provider_reference ~ '^AIAIAC-MAN-[A-Z0-9]{24}$'",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_source_allowed",
    {
      check: "payment_source IN ('PAYSTACK', 'MANUAL')",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_method_allowed",
    {
      check: "payment_method IN ('PAYSTACK', 'BANK_TRANSFER', 'OFFLINE')",
    },
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
        "status IN ('INITIALIZED', 'PENDING', 'PENDING_CONFIRMATION', 'PAID', 'FAILED', " +
        "'ABANDONED', 'REVERSED', 'DUPLICATE_SUCCESS', 'RECONCILIATION_REQUIRED')",
    },
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_financial_state_consistent",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_financial_state_consistent",
    {
      check: `
        (financial_authority = 'UNRESOLVED' AND
          status IN ('INITIALIZED', 'PENDING', 'PENDING_CONFIRMATION', 'FAILED', 'ABANDONED', 'REVERSED'))
        OR
        (financial_authority = 'AUTHORITATIVE' AND
          status IN ('PAID', 'RECONCILIATION_REQUIRED', 'REVERSED'))
        OR
        (financial_authority = 'NON_AUTHORITATIVE' AND
          status IN ('DUPLICATE_SUCCESS', 'RECONCILIATION_REQUIRED', 'REVERSED'))
      `,
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_manual_fields_consistent",
    {
      check: `
      (payment_source = 'PAYSTACK' AND provider = 'PAYSTACK' AND payment_method = 'PAYSTACK'
        AND external_reference IS NULL AND recorded_by_admin_id IS NULL
        AND confirmed_by_admin_id IS NULL AND confirmed_at IS NULL)
      OR
      (payment_source = 'MANUAL' AND provider = 'MANUAL'
        AND payment_method IN ('BANK_TRANSFER', 'OFFLINE')
        AND external_reference IS NOT NULL AND payment_date IS NOT NULL
        AND recorded_by_admin_id IS NOT NULL
        AND (
          (status = 'PENDING_CONFIRMATION' AND financial_authority = 'UNRESOLVED'
            AND confirmed_by_admin_id IS NULL AND confirmed_at IS NULL)
          OR
          (status = 'PAID' AND financial_authority = 'AUTHORITATIVE'
            AND confirmed_by_admin_id IS NOT NULL AND confirmed_at IS NOT NULL)
        ))
    `,
    },
  );
  pgm.sql(`
    CREATE UNIQUE INDEX "IDX_payment_transactions_manual_external_reference"
      ON payment_transactions (lower(external_reference))
      WHERE payment_source = 'MANUAL';
    CREATE UNIQUE INDEX "IDX_payment_transactions_one_pending_manual_registration"
      ON payment_transactions (registration_id)
      WHERE payment_source = 'MANUAL' AND status = 'PENDING_CONFIRMATION';
  `);

  pgm.dropConstraint("payment_events", "payment_events_type_allowed");
  pgm.addConstraint("payment_events", "payment_events_type_allowed", {
    check:
      "event_type IN ('PAYMENT_INITIALIZED', 'PAYMENT_CONFIRMED', 'PAYMENT_VERIFICATION_FAILED', " +
      "'PAYMENT_DUPLICATE_SUCCESS', 'PAYMENT_RECONCILIATION_ATTEMPTED', " +
      "'PAYMENT_RECONCILIATION_REQUIRED', 'PAYMENT_RECONCILIATION_RESOLVED', " +
      "'MANUAL_PAYMENT_RECORDED', 'MANUAL_PAYMENT_CONFIRMED', " +
      "'MANUAL_PAYMENT_CONFIRMATION_FAILED', 'EVENT_PASS_ISSUED', " +
      "'DELEGATE_CONFIRMATION_SENT', 'DELEGATE_CONFIRMATION_FAILED', " +
      "'ADMIN_PAYMENT_NOTIFICATION_SENT', 'ADMIN_PAYMENT_NOTIFICATION_FAILED')",
  });

  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: `action IN (${[...previousAuditActions, ...manualAuditActions]
      .map((action) => `'${action}'`)
      .join(", ")})`,
  });
  pgm.addConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
    {
      check:
        "entity_type IN ('ADMIN_USER', 'ADMIN_INVITATION', 'COMMUNICATION_CAMPAIGN', 'PAYMENT_TRANSACTION')",
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
  );
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: `action IN (${previousAuditActions.map((action) => `'${action}'`).join(", ")})`,
  });
  pgm.dropConstraint("payment_events", "payment_events_type_allowed");
  pgm.sql(
    `DELETE FROM payment_events WHERE event_type LIKE 'MANUAL_PAYMENT_%'`,
  );
  pgm.addConstraint("payment_events", "payment_events_type_allowed", {
    check:
      "event_type IN ('PAYMENT_INITIALIZED', 'PAYMENT_CONFIRMED', 'PAYMENT_VERIFICATION_FAILED', " +
      "'PAYMENT_DUPLICATE_SUCCESS', 'PAYMENT_RECONCILIATION_ATTEMPTED', " +
      "'PAYMENT_RECONCILIATION_REQUIRED', 'PAYMENT_RECONCILIATION_RESOLVED', " +
      "'EVENT_PASS_ISSUED', 'DELEGATE_CONFIRMATION_SENT', 'DELEGATE_CONFIRMATION_FAILED', " +
      "'ADMIN_PAYMENT_NOTIFICATION_SENT', 'ADMIN_PAYMENT_NOTIFICATION_FAILED')",
  });
  pgm.sql(`
    DELETE FROM payment_transactions WHERE payment_source = 'MANUAL';
    DROP INDEX "IDX_payment_transactions_one_pending_manual_registration";
    DROP INDEX "IDX_payment_transactions_manual_external_reference";
  `);
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_manual_fields_consistent",
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_financial_state_consistent",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_financial_state_consistent",
    {
      check: `
      (financial_authority = 'UNRESOLVED' AND status IN ('INITIALIZED', 'PENDING', 'FAILED', 'ABANDONED', 'REVERSED'))
      OR (financial_authority = 'AUTHORITATIVE' AND status IN ('PAID', 'RECONCILIATION_REQUIRED', 'REVERSED'))
      OR (financial_authority = 'NON_AUTHORITATIVE' AND status IN ('DUPLICATE_SUCCESS', 'RECONCILIATION_REQUIRED', 'REVERSED'))
    `,
    },
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
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_method_allowed",
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_source_allowed",
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_reference_format",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_reference_format",
    {
      check: "provider_reference ~ '^AIAIAC-PAY-[A-Z0-9]{24}$'",
    },
  );
  pgm.dropConstraint(
    "payment_transactions",
    "payment_transactions_provider_allowed",
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_provider_allowed",
    {
      check: "provider IN ('PAYSTACK')",
    },
  );
  pgm.dropColumns("payment_transactions", [
    "payment_source",
    "payment_method",
    "external_reference",
    "payer_name",
    "internal_note",
    "payment_date",
    "recorded_by_admin_id",
    "confirmed_by_admin_id",
    "confirmed_at",
  ]);
}
