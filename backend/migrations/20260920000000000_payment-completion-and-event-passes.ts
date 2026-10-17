import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("delegate_event_passes", {
    id: { type: "uuid", primaryKey: true },
    registration_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: '"delegate_registrations"',
      onDelete: "RESTRICT",
    },
    credential_hash: { type: "char(64)", notNull: true, unique: true },
    status: { type: "varchar(16)", notNull: true, default: "ACTIVE" },
    issued_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    checked_in_at: { type: "timestamptz" },
    delivery_status: {
      type: "varchar(16)",
      notNull: true,
      default: "NOT_QUEUED",
    },
    delivery_attempts: { type: "integer", notNull: true, default: 0 },
    delivery_last_attempt_at: { type: "timestamptz" },
    delivery_sent_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "delegate_event_passes",
    "delegate_event_passes_credential_hash_format",
    { check: "credential_hash ~ '^[a-f0-9]{64}$'" },
  );
  pgm.addConstraint(
    "delegate_event_passes",
    "delegate_event_passes_status_allowed",
    { check: "status IN ('ACTIVE', 'REVOKED')" },
  );
  pgm.addConstraint(
    "delegate_event_passes",
    "delegate_event_passes_delivery_status_allowed",
    { check: "delivery_status IN ('NOT_QUEUED', 'PENDING', 'SENT', 'FAILED')" },
  );
  pgm.addConstraint(
    "delegate_event_passes",
    "delegate_event_passes_delivery_attempts_nonnegative",
    { check: "delivery_attempts >= 0" },
  );
  pgm.createIndex("delegate_event_passes", ["status", "issued_at"], {
    name: "IDX_delegate_event_passes_status",
  });

  pgm.createTable("payment_admin_notifications", {
    id: { type: "uuid", primaryKey: true },
    payment_transaction_id: {
      type: "uuid",
      notNull: true,
      references: '"payment_transactions"',
      onDelete: "CASCADE",
    },
    admin_id: {
      type: "uuid",
      notNull: true,
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    recipient_email_snapshot: { type: "varchar(254)", notNull: true },
    recipient_name_snapshot: { type: "varchar(160)", notNull: true },
    status: { type: "varchar(16)", notNull: true, default: "NOT_QUEUED" },
    attempts: { type: "integer", notNull: true, default: 0 },
    last_attempt_at: { type: "timestamptz" },
    sent_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_payment_admin_unique",
    { unique: ["payment_transaction_id", "admin_id"] },
  );
  pgm.addConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_status_allowed",
    { check: "status IN ('NOT_QUEUED', 'PENDING', 'SENT', 'FAILED')" },
  );
  pgm.addConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_attempts_nonnegative",
    { check: "attempts >= 0" },
  );
  pgm.addConstraint(
    "payment_admin_notifications",
    "payment_admin_notifications_email_normalized",
    {
      check:
        "recipient_email_snapshot = lower(btrim(recipient_email_snapshot))",
    },
  );
  pgm.createIndex(
    "payment_admin_notifications",
    ["payment_transaction_id", "status"],
    { name: "IDX_payment_admin_notifications_payment_status" },
  );

  pgm.dropConstraint("payment_events", "payment_events_type_allowed");
  pgm.addConstraint("payment_events", "payment_events_type_allowed", {
    check:
      "event_type IN ('PAYMENT_INITIALIZED', 'PAYMENT_CONFIRMED', " +
      "'PAYMENT_VERIFICATION_FAILED', 'EVENT_PASS_ISSUED', " +
      "'DELEGATE_CONFIRMATION_SENT', 'DELEGATE_CONFIRMATION_FAILED', " +
      "'ADMIN_PAYMENT_NOTIFICATION_SENT', 'ADMIN_PAYMENT_NOTIFICATION_FAILED')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("payment_events", "payment_events_type_allowed");
  pgm.sql(
    `DELETE FROM payment_events
     WHERE event_type IN (
       'EVENT_PASS_ISSUED', 'DELEGATE_CONFIRMATION_SENT',
       'DELEGATE_CONFIRMATION_FAILED', 'ADMIN_PAYMENT_NOTIFICATION_SENT',
       'ADMIN_PAYMENT_NOTIFICATION_FAILED'
     )`,
  );
  pgm.addConstraint("payment_events", "payment_events_type_allowed", {
    check:
      "event_type IN ('PAYMENT_INITIALIZED', 'PAYMENT_CONFIRMED', 'PAYMENT_VERIFICATION_FAILED')",
  });
  pgm.dropTable("payment_admin_notifications");
  pgm.dropTable("delegate_event_passes");
}
