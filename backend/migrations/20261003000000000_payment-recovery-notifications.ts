import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("payment_recovery_notifications", {
    id: { type: "uuid", primaryKey: true },
    payment_transaction_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: '"payment_transactions"',
      onDelete: "CASCADE",
    },
    registration_id: {
      type: "uuid",
      notNull: true,
      references: '"delegate_registrations"',
      onDelete: "CASCADE",
    },
    recipient_email_snapshot: { type: "varchar(254)", notNull: true },
    recipient_name_snapshot: { type: "varchar(160)", notNull: true },
    delegate_type_snapshot: { type: "varchar(24)", notNull: true },
    payment_status_snapshot: { type: "varchar(24)", notNull: true },
    status: { type: "varchar(16)", notNull: true, default: "PENDING" },
    attempts: { type: "integer", notNull: true, default: 1 },
    last_attempt_at: { type: "timestamptz", notNull: true },
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
    "payment_recovery_notifications",
    "payment_recovery_notifications_delegate_type_allowed",
    { check: "delegate_type_snapshot IN ('PROFESSIONAL', 'STUDENT')" },
  );
  pgm.addConstraint(
    "payment_recovery_notifications",
    "payment_recovery_notifications_payment_status_allowed",
    { check: "payment_status_snapshot IN ('FAILED', 'ABANDONED')" },
  );
  pgm.addConstraint(
    "payment_recovery_notifications",
    "payment_recovery_notifications_status_allowed",
    { check: "status IN ('PENDING', 'SENT', 'FAILED')" },
  );
  pgm.addConstraint(
    "payment_recovery_notifications",
    "payment_recovery_notifications_attempts_bounded",
    { check: "attempts BETWEEN 1 AND 3" },
  );
  pgm.createIndex("payment_recovery_notifications", ["registration_id", "status"], {
    name: "IDX_payment_recovery_notifications_registration_status",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("payment_recovery_notifications");
}
