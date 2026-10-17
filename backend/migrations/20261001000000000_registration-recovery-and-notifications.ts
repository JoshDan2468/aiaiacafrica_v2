import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("delegate_registration_recovery", {
    registration_id: {
      type: "uuid",
      primaryKey: true,
      references: '"delegate_registrations"',
      onDelete: "CASCADE",
    },
    recovery_token_hash: { type: "char(64)", unique: true },
    recovery_expires_at: { type: "timestamptz" },
    recovery_consumed_at: { type: "timestamptz" },
    continuation_token_hash: { type: "char(64)", unique: true },
    continuation_expires_at: { type: "timestamptz" },
    request_count: { type: "integer", notNull: true, default: 0 },
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
    "delegate_registration_recovery",
    "delegate_registration_recovery_hash_format",
    {
      check:
        "(recovery_token_hash IS NULL OR recovery_token_hash ~ '^[a-f0-9]{64}$') AND " +
        "(continuation_token_hash IS NULL OR continuation_token_hash ~ '^[a-f0-9]{64}$')",
    },
  );
  pgm.addConstraint(
    "delegate_registration_recovery",
    "delegate_registration_recovery_request_count_nonnegative",
    { check: "request_count >= 0" },
  );

  pgm.createTable("delegate_registration_admin_notifications", {
    id: { type: "uuid", primaryKey: true },
    registration_id: {
      type: "uuid",
      notNull: true,
      references: '"delegate_registrations"',
      onDelete: "CASCADE",
    },
    admin_id: {
      type: "uuid",
      notNull: true,
      references: '"admins"',
      onDelete: "CASCADE",
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
    "delegate_registration_admin_notifications",
    "delegate_registration_admin_notifications_unique",
    { unique: ["registration_id", "admin_id"] },
  );
  pgm.addConstraint(
    "delegate_registration_admin_notifications",
    "delegate_registration_admin_notifications_status_allowed",
    { check: "status IN ('NOT_QUEUED', 'PENDING', 'SENT', 'FAILED')" },
  );
  pgm.addConstraint(
    "delegate_registration_admin_notifications",
    "delegate_registration_admin_notifications_attempts_nonnegative",
    { check: "attempts >= 0" },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("delegate_registration_admin_notifications");
  pgm.dropTable("delegate_registration_recovery");
}
