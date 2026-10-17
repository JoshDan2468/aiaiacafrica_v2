import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns("delegate_registrations", {
    email_verification_status: {
      type: "varchar(16)",
      notNull: true,
      default: "VERIFIED",
    },
    email_verified_at: { type: "timestamptz" },
  });
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_email_verification_status_allowed",
    { check: "email_verification_status IN ('UNVERIFIED', 'VERIFIED')" },
  );

  // Existing registrations pre-date this control. Treating them as verified avoids
  // locking legitimate delegates out of payment while all new rows default to unverified.
  pgm.sql(`
    UPDATE delegate_registrations
    SET email_verified_at = COALESCE(submitted_at, created_at, current_timestamp)
    WHERE email_verification_status = 'VERIFIED' AND email_verified_at IS NULL;

    ALTER TABLE delegate_registrations
      ALTER COLUMN email_verification_status SET DEFAULT 'UNVERIFIED';
  `);

  pgm.createTable("delegate_email_verifications", {
    registration_id: {
      type: "uuid",
      primaryKey: true,
      references: '"delegate_registrations"',
      onDelete: "CASCADE",
    },
    token_hash: { type: "char(64)", notNull: true, unique: true },
    expires_at: { type: "timestamptz", notNull: true },
    consumed_at: { type: "timestamptz" },
    email_sent_at: { type: "timestamptz" },
    request_count: { type: "integer", notNull: true, default: 1 },
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
    "delegate_email_verifications",
    "delegate_email_verifications_hash_format",
    { check: "token_hash ~ '^[a-f0-9]{64}$'" },
  );
  pgm.addConstraint(
    "delegate_email_verifications",
    "delegate_email_verifications_request_count_positive",
    { check: "request_count >= 1" },
  );
  pgm.createIndex("delegate_email_verifications", "expires_at", {
    name: "IDX_delegate_email_verifications_expiry",
  });

  pgm.createTable("delegate_email_verification_events", {
    id: { type: "uuid", primaryKey: true },
    registration_id: {
      type: "uuid",
      references: '"delegate_registrations"',
      onDelete: "CASCADE",
    },
    event_type: { type: "varchar(48)", notNull: true },
    details: { type: "jsonb", notNull: true, default: "{}" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "delegate_email_verification_events",
    "delegate_email_verification_events_type_allowed",
    {
      check:
        "event_type IN ('EMAIL_VERIFICATION_REQUESTED', 'EMAIL_VERIFICATION_RESENT', " +
        "'EMAIL_VERIFICATION_SENT', 'EMAIL_VERIFICATION_DELIVERY_FAILED', " +
        "'EMAIL_VERIFICATION_COMPLETED', 'EMAIL_VERIFICATION_INVALID_ATTEMPT', " +
        "'EMAIL_VERIFICATION_EXPIRED_ATTEMPT')",
    },
  );
  pgm.createIndex(
    "delegate_email_verification_events",
    ["registration_id", "created_at"],
    { name: "IDX_delegate_email_verification_events_registration" },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("delegate_email_verification_events");
  pgm.dropTable("delegate_email_verifications");
  pgm.dropConstraint(
    "delegate_registrations",
    "delegate_registrations_email_verification_status_allowed",
  );
  pgm.dropColumns("delegate_registrations", [
    "email_verification_status",
    "email_verified_at",
  ]);
}
