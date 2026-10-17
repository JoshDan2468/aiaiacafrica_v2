import type { MigrationBuilder } from "node-pg-migrate";

const previousActions = [
  "USER_INVITED",
  "INVITATION_RESENT",
  "INVITATION_REVOKED",
  "INVITATION_ACCEPTED",
  "USER_ROLE_CHANGED",
  "USER_DISABLED",
  "USER_ENABLED",
];

function actionConstraint(actions: readonly string[]): string {
  return `action IN (${actions.map((action) => `'${action}'`).join(", ")})`;
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: actionConstraint([
      ...previousActions,
      "ADMIN_LOGIN",
      "ADMIN_LOGOUT",
      "ADMIN_SESSION_EXPIRED",
    ]),
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: actionConstraint(previousActions),
  });
}
