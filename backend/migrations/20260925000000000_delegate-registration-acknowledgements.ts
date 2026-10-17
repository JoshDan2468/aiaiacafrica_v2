import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("delegate_registration_acknowledgements", {
    registration_id: {
      type: "uuid",
      primaryKey: true,
      references: '"delegate_registrations"',
      onDelete: "CASCADE",
    },
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
    "delegate_registration_acknowledgements",
    "delegate_registration_acknowledgements_status_allowed",
    { check: "status IN ('NOT_QUEUED', 'PENDING', 'SENT', 'FAILED')" },
  );
  pgm.addConstraint(
    "delegate_registration_acknowledgements",
    "delegate_registration_acknowledgements_attempts_nonnegative",
    { check: "attempts >= 0" },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("delegate_registration_acknowledgements");
}
