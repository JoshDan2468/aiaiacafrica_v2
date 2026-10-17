import type { MigrationBuilder } from "node-pg-migrate";

const previousRoles = [
  "SUPER_ADMIN", "ADMIN", "FINANCE", "REGISTRATION_MANAGER",
  "COMMUNICATIONS", "CHECK_IN_STAFF",
];

function setRoles(pgm: MigrationBuilder, roles: readonly string[]): void {
  for (const table of ["admins", "admin_invitations"]) {
    pgm.dropConstraint(table, `${table}_role_allowed`);
    pgm.addConstraint(table, `${table}_role_allowed`, {
      check: `role IN (${roles.map((role) => `'${role}'`).join(", ")})`,
    });
  }
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  setRoles(pgm, [...previousRoles, "ABSTRACT_VIEWER"]);
}

// Rollback fails safely if viewer accounts exist; it never rewrites their roles.
export async function down(pgm: MigrationBuilder): Promise<void> {
  setRoles(pgm, previousRoles);
}
