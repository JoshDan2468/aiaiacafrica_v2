/**
 * Admin user access milestone
 *
 * Extends staff roles and adds invitation and security-audit persistence.
 * Invitation tokens are represented only by deterministic hashes.
 */

import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("admins", "admins_role_allowed");
  pgm.addConstraint("admins", "admins_role_allowed", {
    check:
      "role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'REGISTRATION_MANAGER', 'COMMUNICATIONS')",
  });
  pgm.addColumn("admins", {
    created_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "SET NULL",
    },
  });

  pgm.createTable("admin_invitations", {
    id: { type: "uuid", primaryKey: true },
    email: { type: "varchar(254)", notNull: true },
    full_name: { type: "varchar(100)", notNull: true },
    role: { type: "varchar(32)", notNull: true },
    token_hash: { type: "char(64)", notNull: true, unique: true },
    invited_by_admin_id: {
      type: "uuid",
      notNull: true,
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    expires_at: { type: "timestamptz", notNull: true },
    accepted_at: { type: "timestamptz" },
    revoked_at: { type: "timestamptz" },
    email_sent_at: { type: "timestamptz" },
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
  pgm.addConstraint("admin_invitations", "admin_invitations_email_normalized", {
    check: "email = lower(btrim(email))",
  });
  pgm.addConstraint("admin_invitations", "admin_invitations_name_not_blank", {
    check: "char_length(btrim(full_name)) >= 2",
  });
  pgm.addConstraint("admin_invitations", "admin_invitations_role_allowed", {
    check:
      "role IN ('ADMIN', 'FINANCE', 'REGISTRATION_MANAGER', 'COMMUNICATIONS')",
  });
  pgm.addConstraint(
    "admin_invitations",
    "admin_invitations_token_hash_format",
    {
      check: "token_hash ~ '^[0-9a-f]{64}$'",
    },
  );
  pgm.addConstraint("admin_invitations", "admin_invitations_terminal_state", {
    check: "NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)",
  });
  pgm.createIndex("admin_invitations", "email");
  pgm.createIndex(
    "admin_invitations",
    ["accepted_at", "revoked_at", "expires_at"],
    {
      name: "IDX_admin_invitations_status",
    },
  );

  pgm.createTable("admin_audit_logs", {
    id: { type: "uuid", primaryKey: true },
    admin_id: {
      type: "uuid",
      notNull: true,
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    action: { type: "varchar(40)", notNull: true },
    entity_type: { type: "varchar(40)", notNull: true },
    entity_id: { type: "uuid", notNull: true },
    metadata: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check:
      "action IN ('USER_INVITED', 'INVITATION_RESENT', 'INVITATION_REVOKED', " +
      "'INVITATION_ACCEPTED', 'USER_ROLE_CHANGED', 'USER_DISABLED', 'USER_ENABLED')",
  });
  pgm.createIndex("admin_audit_logs", ["admin_id", "created_at"]);
  pgm.createIndex(
    "admin_audit_logs",
    ["entity_type", "entity_id", "created_at"],
    {
      name: "IDX_admin_audit_logs_entity",
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("admin_audit_logs");
  pgm.dropTable("admin_invitations");
  pgm.dropColumn("admins", "created_by_admin_id");
  pgm.dropConstraint("admins", "admins_role_allowed");
  pgm.addConstraint("admins", "admins_role_allowed", {
    check: "role IN ('SUPER_ADMIN', 'ADMIN')",
  });
}
