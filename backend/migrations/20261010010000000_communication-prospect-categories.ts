import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE communication_manual_contacts ADD COLUMN category varchar(32) NOT NULL DEFAULT 'GENERAL_CONTACT'
    CHECK (category IN ('GENERAL_CONTACT','PROSPECTIVE_DELEGATE','PROSPECTIVE_SPONSOR','PROSPECTIVE_EXHIBITOR'));`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("communication_manual_contacts", "category");
}
