import type { MigrationBuilder } from "node-pg-migrate";

// Delegate accreditation is a dependent identity link, never the authoritative registration.
// Existing synthetic registration cleanup must not be blocked by this new foundation table.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint(
    "event_accreditations",
    "event_accreditations_delegate_registration_id_fkey",
  );
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_delegate_registration_id_fkey",
    {
      foreignKeys: {
        columns: "delegate_registration_id",
        references: "delegate_registrations(id)",
        onDelete: "CASCADE",
      },
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint(
    "event_accreditations",
    "event_accreditations_delegate_registration_id_fkey",
  );
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_delegate_registration_id_fkey",
    {
      foreignKeys: {
        columns: "delegate_registration_id",
        references: "delegate_registrations(id)",
        onDelete: "RESTRICT",
      },
    },
  );
}
