import type { MigrationBuilder } from "node-pg-migrate";

const categories =
  "('GENERAL','REGISTRATION','SPONSORSHIP','EXHIBITION','MEDIA','SPEAKER_ABSTRACT','PARTNERSHIP','OTHER')";
const statuses = "('OPEN','IN_PROGRESS','RESOLVED','CLOSED')";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("enquiries", {
    id: { type: "uuid", primaryKey: true },
    reference: { type: "varchar(32)", notNull: true, unique: true },
    event_year: { type: "smallint", notNull: true, default: 2027 },
    first_name: { type: "varchar(100)", notNull: true },
    last_name: { type: "varchar(100)", notNull: true },
    email: { type: "varchar(254)", notNull: true },
    phone: { type: "varchar(40)" },
    organization: { type: "varchar(200)" },
    country: { type: "varchar(100)" },
    category: { type: "varchar(32)", notNull: true },
    subject: { type: "varchar(160)", notNull: true },
    message: { type: "text", notNull: true },
    status: { type: "varchar(20)", notNull: true, default: "OPEN" },
    submission_key_hash: { type: "char(64)", notNull: true, unique: true },
    payload_fingerprint: { type: "char(64)", notNull: true },
    resolved_at: { type: "timestamptz" },
    closed_at: { type: "timestamptz" },
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
  pgm.addConstraint("enquiries", "enquiries_reference_valid", {
    check: "reference ~ '^AIAIAC-ENQ-[A-Z0-9]{8}$'",
  });
  pgm.addConstraint("enquiries", "enquiries_category_valid", {
    check: `category IN ${categories}`,
  });
  pgm.addConstraint("enquiries", "enquiries_status_valid", {
    check: `status IN ${statuses}`,
  });
  pgm.addConstraint("enquiries", "enquiries_content_valid", {
    check:
      "event_year=2027 AND char_length(btrim(message)) BETWEEN 20 AND 3000",
  });
  pgm.addConstraint("enquiries", "enquiries_hashes_valid", {
    check:
      "submission_key_hash ~ '^[0-9a-f]{64}$' AND payload_fingerprint ~ '^[0-9a-f]{64}$'",
  });
  pgm.createIndex("enquiries", ["status", "created_at"], {
    name: "IDX_enquiries_queue",
  });
  pgm.createIndex("enquiries", ["category", "created_at"], {
    name: "IDX_enquiries_category",
  });

  pgm.createTable("enquiry_history", {
    id: { type: "uuid", primaryKey: true },
    enquiry_id: {
      type: "uuid",
      notNull: true,
      references: '"enquiries"',
      onDelete: "CASCADE",
    },
    action: { type: "varchar(20)", notNull: true },
    from_status: { type: "varchar(20)" },
    to_status: { type: "varchar(20)", notNull: true },
    admin_id: { type: "uuid", references: '"admins"', onDelete: "RESTRICT" },
    internal_note: { type: "varchar(1000)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("enquiry_history", "enquiry_history_action_valid", {
    check: `action IN ('SUBMITTED','IN_PROGRESS','RESOLVED','CLOSED') AND to_status IN ${statuses} AND (from_status IS NULL OR from_status IN ${statuses})`,
  });
  pgm.addConstraint("enquiry_history", "enquiry_history_actor_valid", {
    check:
      "(action='SUBMITTED' AND admin_id IS NULL) OR (action<>'SUBMITTED' AND admin_id IS NOT NULL)",
  });
  pgm.createIndex("enquiry_history", ["enquiry_id", "created_at"], {
    name: "IDX_enquiry_history_timeline",
  });

  pgm.createTable("enquiry_notifications", {
    id: { type: "uuid", primaryKey: true },
    enquiry_id: {
      type: "uuid",
      notNull: true,
      references: '"enquiries"',
      onDelete: "CASCADE",
    },
    recipient_kind: { type: "varchar(20)", notNull: true },
    recipient_email: { type: "varchar(254)", notNull: true },
    recipient_name: { type: "varchar(200)", notNull: true },
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
    "enquiry_notifications",
    "enquiry_notifications_kind_valid",
    { check: "recipient_kind IN ('ACKNOWLEDGEMENT','INTERNAL')" },
  );
  pgm.addConstraint(
    "enquiry_notifications",
    "enquiry_notifications_status_valid",
    {
      check:
        "status IN ('PENDING','SENT','FAILED') AND attempts BETWEEN 0 AND 3",
    },
  );
  pgm.addConstraint(
    "enquiry_notifications",
    "enquiry_notifications_unique_recipient",
    { unique: ["enquiry_id", "recipient_kind", "recipient_email"] },
  );
  pgm.createIndex("enquiry_notifications", ["enquiry_id", "status"], {
    name: "IDX_enquiry_notifications_delivery",
  });

  pgm.createTable("enquiry_events", {
    id: { type: "uuid", primaryKey: true },
    enquiry_id: {
      type: "uuid",
      notNull: true,
      references: '"enquiries"',
      onDelete: "CASCADE",
    },
    event_type: { type: "varchar(40)", notNull: true },
    admin_id: { type: "uuid", references: '"admins"', onDelete: "RESTRICT" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("enquiry_events", "enquiry_events_type_valid", {
    check:
      "event_type IN ('ENQUIRY_SUBMITTED','ENQUIRY_IN_PROGRESS','ENQUIRY_RESOLVED','ENQUIRY_CLOSED','ENQUIRY_NOTIFICATION_SENT','ENQUIRY_NOTIFICATION_FAILED')",
  });
  pgm.createIndex("enquiry_events", ["enquiry_id", "created_at"], {
    name: "IDX_enquiry_events_timeline",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("enquiry_events");
  pgm.dropTable("enquiry_notifications");
  pgm.dropTable("enquiry_history");
  pgm.dropTable("enquiries");
}
