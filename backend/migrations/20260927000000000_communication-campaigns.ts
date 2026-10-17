import type { MigrationBuilder } from "node-pg-migrate";

const oldActions = [
  "USER_INVITED", "INVITATION_RESENT", "INVITATION_REVOKED", "INVITATION_ACCEPTED",
  "USER_ROLE_CHANGED", "USER_DISABLED", "USER_ENABLED", "ADMIN_LOGIN",
  "ADMIN_LOGOUT", "ADMIN_SESSION_EXPIRED",
];
const campaignActions = [
  "CAMPAIGN_CREATED", "CAMPAIGN_UPDATED", "CAMPAIGN_TEST_SENT",
  "CAMPAIGN_CONFIRMED", "CAMPAIGN_SEND_STARTED", "CAMPAIGN_SEND_COMPLETED",
  "CAMPAIGN_RETRIED",
];
const actionCheck = (actions: string[]) =>
  `action IN (${actions.map((action) => `'${action}'`).join(", ")})`;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("communication_campaigns", {
    id: { type: "uuid", primaryKey: true },
    reference: { type: "varchar(32)", notNull: true, unique: true },
    title: { type: "varchar(120)", notNull: true },
    subject: { type: "varchar(180)", notNull: true },
    preheader: { type: "varchar(180)", notNull: true },
    heading: { type: "varchar(180)", notNull: true },
    body: { type: "text", notNull: true },
    cta_label: { type: "varchar(80)" },
    cta_url: { type: "varchar(500)" },
    audience: { type: "jsonb", notNull: true },
    status: { type: "varchar(24)", notNull: true, default: "DRAFT" },
    recipient_count: { type: "integer", notNull: true, default: 0 },
    created_by_admin_id: { type: "uuid", notNull: true, references: '"admins"', onDelete: "RESTRICT" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    sent_at: { type: "timestamptz" },
  });
  pgm.addConstraint("communication_campaigns", "communication_campaigns_status_allowed", {
    check: "status IN ('DRAFT','SENDING','SENT','PARTIALLY_FAILED','FAILED') AND recipient_count BETWEEN 0 AND 500",
  });
  pgm.createIndex("communication_campaigns", ["created_at"], { name: "IDX_communication_campaigns_created" });

  pgm.createTable("communication_deliveries", {
    id: { type: "uuid", primaryKey: true },
    campaign_id: { type: "uuid", notNull: true, references: '"communication_campaigns"', onDelete: "CASCADE" },
    recipient_email: { type: "varchar(254)", notNull: true },
    recipient_name: { type: "varchar(200)", notNull: true },
    source_category: { type: "varchar(32)", notNull: true },
    status: { type: "varchar(16)", notNull: true, default: "PENDING" },
    attempts: { type: "smallint", notNull: true, default: 0 },
    provider_message_id: { type: "varchar(120)" },
    error_summary: { type: "varchar(120)" },
    claimed_at: { type: "timestamptz" },
    sent_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("communication_deliveries", "communication_deliveries_unique_recipient", {
    unique: ["campaign_id", "recipient_email"],
  });
  pgm.addConstraint("communication_deliveries", "communication_deliveries_status_allowed", {
    check: "status IN ('PENDING','CLAIMED','SENT','FAILED') AND attempts BETWEEN 0 AND 3",
  });
  pgm.createIndex("communication_deliveries", ["campaign_id", "status", "created_at"], {
    name: "IDX_communication_deliveries_queue",
  });
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: actionCheck([...oldActions, ...campaignActions]),
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("communication_deliveries");
  pgm.dropTable("communication_campaigns");
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: actionCheck(oldActions),
  });
}
