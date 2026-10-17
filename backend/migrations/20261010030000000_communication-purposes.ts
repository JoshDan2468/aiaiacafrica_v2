import type { MigrationBuilder } from "node-pg-migrate";
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE communication_campaigns DROP CONSTRAINT communication_campaigns_purpose_check;
    ALTER TABLE communication_campaigns ADD CONSTRAINT communication_campaigns_purpose_check CHECK(purpose IN ('MARKETING','EVENT_ANNOUNCEMENT','DELEGATE_UPDATE','SPONSOR_OUTREACH','EXHIBITOR_OUTREACH','PAYMENT_REMINDER'));`);
}
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE communication_campaigns DROP CONSTRAINT communication_campaigns_purpose_check;
    ALTER TABLE communication_campaigns ADD CONSTRAINT communication_campaigns_purpose_check CHECK(purpose IN ('MARKETING','PAYMENT_REMINDER'));`);
}
