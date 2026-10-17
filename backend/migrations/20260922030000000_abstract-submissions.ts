import type { MigrationBuilder } from "node-pg-migrate";

const statuses =
  "('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'ACCEPTED', 'REJECTED')";
const actions =
  "('SUBMITTED', 'REVIEW_STARTED', 'REVISION_REQUIRED', 'RESUBMITTED', 'ACCEPTED', 'REJECTED')";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("abstract_submissions", {
    id: { type: "uuid", primaryKey: true },
    reference: { type: "varchar(32)", notNull: true, unique: true },
    event_year: { type: "smallint", notNull: true, default: 2027 },
    author_first_name: { type: "varchar(100)", notNull: true },
    author_last_name: { type: "varchar(100)", notNull: true },
    author_email: { type: "varchar(254)", notNull: true },
    author_phone: { type: "varchar(40)", notNull: true },
    organization_name: { type: "varchar(200)", notNull: true },
    job_title: { type: "varchar(150)" },
    country: { type: "varchar(100)", notNull: true },
    title: { type: "varchar(300)", notNull: true },
    abstract_body: { type: "text", notNull: true },
    word_count: { type: "smallint", notNull: true },
    keywords: { type: "varchar(500)" },
    topic: { type: "varchar(100)" },
    status: { type: "varchar(32)", notNull: true, default: "SUBMITTED" },
    current_review_reason: { type: "varchar(1000)" },
    content_fingerprint: { type: "char(64)", notNull: true },
    submission_key_hash: { type: "char(64)", notNull: true, unique: true },
    continuation_token_hash: { type: "char(64)", notNull: true },
    continuation_token_expires_at: { type: "timestamptz", notNull: true },
    reviewer_id: { type: "uuid", references: '"admins"', onDelete: "RESTRICT" },
    submitted_at: { type: "timestamptz", notNull: true },
    resubmitted_at: { type: "timestamptz" },
    review_started_at: { type: "timestamptz" },
    decided_at: { type: "timestamptz" },
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
    "abstract_submissions",
    "abstract_submissions_reference_valid",
    {
      check: "reference ~ '^AIAIAC-ABS-[A-Z0-9]{8}$'",
    },
  );
  pgm.addConstraint(
    "abstract_submissions",
    "abstract_submissions_status_allowed",
    {
      check: `status IN ${statuses}`,
    },
  );
  pgm.addConstraint(
    "abstract_submissions",
    "abstract_submissions_content_valid",
    {
      check:
        "event_year = 2027 AND word_count BETWEEN 1 AND 500 AND char_length(btrim(abstract_body)) BETWEEN 20 AND 10000",
    },
  );
  pgm.addConstraint(
    "abstract_submissions",
    "abstract_submissions_hashes_valid",
    {
      check:
        "content_fingerprint ~ '^[0-9a-f]{64}$' AND submission_key_hash ~ '^[0-9a-f]{64}$' AND continuation_token_hash ~ '^[0-9a-f]{64}$'",
    },
  );
  pgm.addConstraint(
    "abstract_submissions",
    "abstract_submissions_content_duplicate_guard",
    {
      unique: ["event_year", "author_email", "content_fingerprint"],
    },
  );
  pgm.createIndex("abstract_submissions", ["status", "submitted_at"], {
    name: "IDX_abstract_submissions_queue",
  });
  pgm.createIndex("abstract_submissions", "author_email", {
    name: "IDX_abstract_submissions_author_email",
  });

  pgm.createTable("abstract_submission_history", {
    id: { type: "uuid", primaryKey: true },
    abstract_submission_id: {
      type: "uuid",
      notNull: true,
      references: '"abstract_submissions"',
      onDelete: "CASCADE",
    },
    action: { type: "varchar(32)", notNull: true },
    from_status: { type: "varchar(32)" },
    to_status: { type: "varchar(32)", notNull: true },
    admin_id: { type: "uuid", references: '"admins"', onDelete: "RESTRICT" },
    author_visible_reason: { type: "varchar(1000)" },
    internal_note: { type: "varchar(1000)" },
    title_snapshot: { type: "varchar(300)", notNull: true },
    abstract_body_snapshot: { type: "text", notNull: true },
    word_count_snapshot: { type: "smallint", notNull: true },
    keywords_snapshot: { type: "varchar(500)" },
    topic_snapshot: { type: "varchar(100)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "abstract_submission_history",
    "abstract_history_action_allowed",
    {
      check: `action IN ${actions} AND to_status IN ${statuses} AND (from_status IS NULL OR from_status IN ${statuses})`,
    },
  );
  pgm.addConstraint(
    "abstract_submission_history",
    "abstract_history_actor_valid",
    {
      check:
        "(action IN ('SUBMITTED', 'RESUBMITTED') AND admin_id IS NULL) OR " +
        "(action IN ('REVIEW_STARTED', 'REVISION_REQUIRED', 'ACCEPTED', 'REJECTED') AND admin_id IS NOT NULL)",
    },
  );
  pgm.addConstraint(
    "abstract_submission_history",
    "abstract_history_reason_valid",
    {
      check:
        "action NOT IN ('REVISION_REQUIRED', 'REJECTED') OR " +
        "(author_visible_reason IS NOT NULL AND char_length(btrim(author_visible_reason)) BETWEEN 10 AND 1000)",
    },
  );
  pgm.createIndex(
    "abstract_submission_history",
    ["abstract_submission_id", "created_at"],
    {
      name: "IDX_abstract_submission_history_timeline",
    },
  );

  pgm.createTable("abstract_notifications", {
    id: { type: "uuid", primaryKey: true },
    abstract_submission_id: {
      type: "uuid",
      notNull: true,
      references: '"abstract_submissions"',
      onDelete: "CASCADE",
    },
    history_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: '"abstract_submission_history"',
      onDelete: "CASCADE",
    },
    notification_type: { type: "varchar(32)", notNull: true },
    recipient_email_snapshot: { type: "varchar(254)", notNull: true },
    recipient_name_snapshot: { type: "varchar(200)", notNull: true },
    author_visible_reason_snapshot: { type: "varchar(1000)" },
    status: { type: "varchar(16)", notNull: true, default: "PENDING" },
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
    "abstract_notifications",
    "abstract_notifications_type_allowed",
    {
      check:
        "notification_type IN ('SUBMITTED', 'REVISION_REQUIRED', 'RESUBMITTED', 'ACCEPTED', 'REJECTED')",
    },
  );
  pgm.addConstraint(
    "abstract_notifications",
    "abstract_notifications_status_allowed",
    {
      check:
        "status IN ('PENDING', 'SENT', 'FAILED') AND attempts BETWEEN 0 AND 3",
    },
  );
  pgm.createIndex(
    "abstract_notifications",
    ["abstract_submission_id", "status", "created_at"],
    {
      name: "IDX_abstract_notifications_delivery",
    },
  );

  pgm.createTable("abstract_recovery_tokens", {
    id: { type: "uuid", primaryKey: true },
    abstract_submission_id: {
      type: "uuid",
      notNull: true,
      references: '"abstract_submissions"',
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
    "abstract_recovery_tokens",
    "abstract_recovery_token_hash_valid",
    {
      check: "token_hash ~ '^[0-9a-f]{64}$'",
    },
  );
  pgm.sql(`CREATE UNIQUE INDEX "IDX_abstract_recovery_active"
    ON abstract_recovery_tokens (abstract_submission_id)
    WHERE consumed_at IS NULL AND invalidated_at IS NULL;`);

  pgm.createTable("abstract_events", {
    id: { type: "uuid", primaryKey: true },
    abstract_submission_id: {
      type: "uuid",
      notNull: true,
      references: '"abstract_submissions"',
      onDelete: "CASCADE",
    },
    event_type: { type: "varchar(64)", notNull: true },
    admin_id: { type: "uuid", references: '"admins"', onDelete: "RESTRICT" },
    details: { type: "jsonb", notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("abstract_events", "abstract_events_type_allowed", {
    check:
      "event_type IN ('ABSTRACT_SUBMITTED', 'ABSTRACT_REVIEW_STARTED', " +
      "'ABSTRACT_REVISION_REQUIRED', 'ABSTRACT_RESUBMITTED', 'ABSTRACT_ACCEPTED', " +
      "'ABSTRACT_REJECTED', 'ABSTRACT_ACCESS_RECOVERY_REQUESTED', " +
      "'ABSTRACT_ACCESS_RECOVERED', 'ABSTRACT_NOTIFICATION_SENT', " +
      "'ABSTRACT_NOTIFICATION_FAILED')",
  });
  pgm.createIndex("abstract_events", ["abstract_submission_id", "created_at"], {
    name: "IDX_abstract_events_timeline",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("abstract_events");
  pgm.dropTable("abstract_recovery_tokens");
  pgm.dropTable("abstract_notifications");
  pgm.dropTable("abstract_submission_history");
  pgm.dropTable("abstract_submissions");
}
