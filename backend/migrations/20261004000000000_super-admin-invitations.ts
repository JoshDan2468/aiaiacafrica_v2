import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("admin_invitations", "admin_invitations_role_allowed");
  pgm.addConstraint("admin_invitations", "admin_invitations_role_allowed", {
    check:
      "role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'REGISTRATION_MANAGER', 'COMMUNICATIONS')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // PostgreSQL refuses the old constraint if a Super Admin invitation still exists.
  pgm.dropConstraint("admin_invitations", "admin_invitations_role_allowed");
  pgm.addConstraint("admin_invitations", "admin_invitations_role_allowed", {
    check:
      "role IN ('ADMIN', 'FINANCE', 'REGISTRATION_MANAGER', 'COMMUNICATIONS')",
  });
}
