import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE communication_campaigns DROP CONSTRAINT communication_campaigns_purpose_check;
    ALTER TABLE communication_campaigns ADD CONSTRAINT communication_campaigns_purpose_check
    CHECK(purpose IN ('MARKETING','EVENT_ANNOUNCEMENT','DELEGATE_UPDATE','SPONSOR_OUTREACH','EXHIBITOR_OUTREACH','PAYMENT_REMINDER','ESSENTIAL_EVENT_UPDATE'));`);
}

export async function down(): Promise<void> {
  throw new Error(
    "Essential event update campaign history requires a reviewed data-preserving rollback",
  );
}
