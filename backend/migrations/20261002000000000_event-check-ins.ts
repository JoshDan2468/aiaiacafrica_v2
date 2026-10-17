import type { MigrationBuilder } from "node-pg-migrate";

const checkInActions = [
  "PASS_VALIDATED",
  "CHECK_IN_CONFIRMED",
  "CHECK_IN_ALREADY_COMPLETED",
  "MANUAL_ATTENDEE_LOOKUP",
  "CHECK_IN_DENIED",
];

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
  "MANUAL_PAYMENT_RECORDED",
  "MANUAL_PAYMENT_CONFIRMED",
  "MANUAL_PAYMENT_CONFIRMATION_FAILED",
];

function actionConstraint(
  pgm: MigrationBuilder,
  actions: readonly string[],
): void {
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: `action IN (${actions.map((action) => `'${action}'`).join(", ")})`,
  });
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("delegate_check_ins", {
    id: { type: "uuid", primaryKey: true },
    event_pass_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: '"delegate_event_passes"',
      onDelete: "RESTRICT",
    },
    registration_id: {
      type: "uuid",
      notNull: true,
      references: '"delegate_registrations"',
      onDelete: "RESTRICT",
    },
    // The current pass model is per registration. A future event model can backfill this key.
    event_key: { type: "varchar(64)" },
    checked_in_at: { type: "timestamptz", notNull: true },
    checked_in_by_admin_id: {
      type: "uuid",
      notNull: true,
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    method: { type: "varchar(16)", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("delegate_check_ins", "delegate_check_ins_method_allowed", {
    check: "method IN ('QR', 'MANUAL_LOOKUP')",
  });
  pgm.createIndex("delegate_check_ins", ["checked_in_at", "id"], {
    name: "IDX_delegate_check_ins_recent",
    method: "btree",
  });
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  actionConstraint(pgm, [...previousAuditActions, ...checkInActions]);
  pgm.dropConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
  );
  pgm.addConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
    {
      check:
        "entity_type IN ('ADMIN_USER', 'ADMIN_INVITATION', 'COMMUNICATION_CAMPAIGN', 'PAYMENT_TRANSACTION', 'EVENT_PASS')",
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
  );
  pgm.addConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
    {
      check:
        "entity_type IN ('ADMIN_USER', 'ADMIN_INVITATION', 'COMMUNICATION_CAMPAIGN', 'PAYMENT_TRANSACTION')",
    },
  );
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  actionConstraint(pgm, previousAuditActions);
  pgm.dropTable("delegate_check_ins");
}
