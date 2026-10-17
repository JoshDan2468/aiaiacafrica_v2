import type { MigrationBuilder } from "node-pg-migrate";

const workflowEventConstraint = "student_verification_events_type_allowed";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("student_verification_history", {
    id: { type: "uuid", primaryKey: true },
    student_verification_id: {
      type: "uuid",
      notNull: true,
      references: '"student_verifications"',
      onDelete: "CASCADE",
    },
    action: { type: "varchar(32)", notNull: true },
    from_status: { type: "varchar(32)", notNull: true },
    to_status: { type: "varchar(32)", notNull: true },
    admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    note: { type: "varchar(1000)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "student_verification_history",
    "student_verification_history_action_allowed",
    {
      check:
        "action IN ('SUBMITTED', 'RESUBMITTED', 'MORE_INFORMATION_REQUIRED', " +
        "'APPROVED', 'REJECTED')",
    },
  );
  pgm.addConstraint(
    "student_verification_history",
    "student_verification_history_statuses_allowed",
    {
      check:
        "from_status IN ('NOT_SUBMITTED', 'PENDING', 'MORE_INFORMATION_REQUIRED', " +
        "'APPROVED', 'REJECTED') AND " +
        "to_status IN ('NOT_SUBMITTED', 'PENDING', 'MORE_INFORMATION_REQUIRED', " +
        "'APPROVED', 'REJECTED')",
    },
  );
  pgm.addConstraint(
    "student_verification_history",
    "student_verification_history_actor_consistent",
    {
      check:
        "(action IN ('SUBMITTED', 'RESUBMITTED') AND admin_id IS NULL) OR " +
        "(action IN ('MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED') " +
        "AND admin_id IS NOT NULL)",
    },
  );
  pgm.addConstraint(
    "student_verification_history",
    "student_verification_history_note_required",
    {
      check:
        "action NOT IN ('MORE_INFORMATION_REQUIRED', 'REJECTED') OR " +
        "char_length(btrim(note)) BETWEEN 10 AND 1000",
    },
  );
  pgm.createIndex(
    "student_verification_history",
    ["student_verification_id", "created_at"],
    { name: "IDX_student_verification_history_timeline" },
  );

  pgm.createTable("student_verification_recovery_tokens", {
    id: { type: "uuid", primaryKey: true },
    student_verification_id: {
      type: "uuid",
      notNull: true,
      references: '"student_verifications"',
      onDelete: "CASCADE",
    },
    token_hash: { type: "char(64)", notNull: true, unique: true },
    expires_at: { type: "timestamptz", notNull: true },
    consumed_at: { type: "timestamptz" },
    invalidated_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "student_verification_recovery_tokens",
    "student_verification_recovery_token_hash_valid",
    { check: "token_hash ~ '^[0-9a-f]{64}$'" },
  );
  pgm.addConstraint(
    "student_verification_recovery_tokens",
    "student_verification_recovery_token_state_consistent",
    { check: "consumed_at IS NULL OR invalidated_at IS NULL" },
  );
  pgm.sql(`
    CREATE UNIQUE INDEX "IDX_student_verification_recovery_active"
      ON student_verification_recovery_tokens (student_verification_id)
      WHERE consumed_at IS NULL AND invalidated_at IS NULL;
  `);
  pgm.createIndex("student_verification_recovery_tokens", "expires_at", {
    name: "IDX_student_verification_recovery_expiry",
  });

  pgm.createTable("student_verification_notifications", {
    id: { type: "uuid", primaryKey: true },
    student_verification_id: {
      type: "uuid",
      notNull: true,
      references: '"student_verifications"',
      onDelete: "CASCADE",
    },
    history_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: '"student_verification_history"',
      onDelete: "CASCADE",
    },
    notification_type: { type: "varchar(32)", notNull: true },
    recipient_email_snapshot: { type: "varchar(254)", notNull: true },
    recipient_name_snapshot: { type: "varchar(200)", notNull: true },
    status: { type: "varchar(16)", notNull: true, default: "NOT_QUEUED" },
    attempts: { type: "smallint", notNull: true, default: 0 },
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
    "student_verification_notifications",
    "student_verification_notification_type_allowed",
    {
      check:
        "notification_type IN ('SUBMITTED', 'RESUBMITTED', " +
        "'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED')",
    },
  );
  pgm.addConstraint(
    "student_verification_notifications",
    "student_verification_notification_status_allowed",
    {
      check: "status IN ('NOT_QUEUED', 'PENDING', 'SENT', 'FAILED')",
    },
  );
  pgm.addConstraint(
    "student_verification_notifications",
    "student_verification_notification_attempts_valid",
    { check: "attempts BETWEEN 0 AND 3" },
  );
  pgm.createIndex(
    "student_verification_notifications",
    ["student_verification_id", "status", "created_at"],
    { name: "IDX_student_verification_notifications_delivery" },
  );

  pgm.dropConstraint("student_verification_events", workflowEventConstraint);
  pgm.addConstraint("student_verification_events", workflowEventConstraint, {
    check:
      "event_type IN ('STUDENT_APPLICATION_CREATED', 'STUDENT_VERIFICATION_SUBMITTED', " +
      "'STUDENT_VERIFICATION_RESUBMITTED', 'STUDENT_MORE_INFORMATION_REQUIRED', " +
      "'STUDENT_VERIFICATION_APPROVED', 'STUDENT_VERIFICATION_REJECTED', " +
      "'STUDENT_EVIDENCE_UPLOADED', 'STUDENT_EVIDENCE_REPLACED', " +
      "'STUDENT_EVIDENCE_SCAN_COMPLETED', 'STUDENT_EVIDENCE_REJECTED', " +
      "'STUDENT_EVIDENCE_ACCESSED', 'STUDENT_VERIFICATION_RECOVERY_REQUESTED', " +
      "'STUDENT_VERIFICATION_ACCESS_RECOVERED', " +
      "'STUDENT_VERIFICATION_NOTIFICATION_SENT', " +
      "'STUDENT_VERIFICATION_NOTIFICATION_FAILED')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("student_verification_events", workflowEventConstraint);
  pgm.addConstraint("student_verification_events", workflowEventConstraint, {
    check:
      "event_type IN ('STUDENT_APPLICATION_CREATED', 'STUDENT_VERIFICATION_SUBMITTED', " +
      "'STUDENT_MORE_INFORMATION_REQUIRED', 'STUDENT_VERIFICATION_APPROVED', " +
      "'STUDENT_VERIFICATION_REJECTED', 'STUDENT_EVIDENCE_UPLOADED', " +
      "'STUDENT_EVIDENCE_REPLACED', 'STUDENT_EVIDENCE_SCAN_COMPLETED', " +
      "'STUDENT_EVIDENCE_REJECTED', 'STUDENT_EVIDENCE_ACCESSED')",
  });
  pgm.dropTable("student_verification_notifications");
  pgm.dropTable("student_verification_recovery_tokens");
  pgm.dropTable("student_verification_history");
}
