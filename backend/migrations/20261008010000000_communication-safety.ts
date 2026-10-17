import type { MigrationBuilder } from "node-pg-migrate";

// Prepared locally only. Apply through the reviewed test/production deployment process.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE communication_preferences (
      id uuid PRIMARY KEY, email varchar(254) NOT NULL UNIQUE CHECK(email=lower(btrim(email))),
      consent varchar(16) NOT NULL DEFAULT 'UNKNOWN' CHECK(consent IN ('UNKNOWN','OPTED_IN','OPTED_OUT')),
      evidence varchar(500), source_label varchar(200), suppressed boolean NOT NULL DEFAULT false,
      suppression_reason varchar(200), updated_by_admin_id uuid REFERENCES admins(id),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK(consent<>'OPTED_IN' OR (evidence IS NOT NULL AND length(btrim(evidence))>0))
    );
    ALTER TABLE communication_manual_contacts ADD COLUMN consent varchar(16) NOT NULL DEFAULT 'UNKNOWN'
      CHECK(consent IN ('UNKNOWN','OPTED_IN','OPTED_OUT'));
    ALTER TABLE communication_manual_contacts ADD COLUMN consent_evidence varchar(500);
    ALTER TABLE communication_manual_contacts ADD COLUMN source_label varchar(200);
    ALTER TABLE communication_campaigns ADD COLUMN purpose varchar(24) NOT NULL DEFAULT 'MARKETING'
      CHECK(purpose IN ('MARKETING','PAYMENT_REMINDER'));
    ALTER TABLE communication_campaigns ADD COLUMN scheduled_at timestamptz;
    ALTER TABLE communication_campaigns ADD COLUMN confirmed_by_admin_id uuid REFERENCES admins(id);
    ALTER TABLE communication_campaigns ADD COLUMN revision integer NOT NULL DEFAULT 1;
    ALTER TABLE communication_campaigns DROP CONSTRAINT communication_campaigns_status_allowed;
    ALTER TABLE communication_campaigns ADD CONSTRAINT communication_campaigns_status_allowed
      CHECK(status IN ('DRAFT','SCHEDULED','CANCELLED','SENDING','SENT','PARTIALLY_FAILED','FAILED') AND recipient_count BETWEEN 0 AND 500);
    ALTER TABLE communication_deliveries DROP CONSTRAINT communication_deliveries_status_allowed;
    ALTER TABLE communication_deliveries ADD CONSTRAINT communication_deliveries_status_allowed
      CHECK(status IN ('PENDING','CLAIMED','SENT','FAILED','SKIPPED','UNCERTAIN') AND attempts BETWEEN 0 AND 3);
    ALTER TABLE communication_deliveries ADD COLUMN provider_status varchar(24);
    ALTER TABLE communication_deliveries ADD COLUMN provider_message_uuid uuid;
    CREATE INDEX communication_deliveries_provider_uuid ON communication_deliveries(provider_message_uuid);
    CREATE INDEX communication_campaigns_due ON communication_campaigns(scheduled_at) WHERE status='SCHEDULED';
    CREATE TABLE communication_send_windows(bucket timestamptz PRIMARY KEY, used integer NOT NULL CHECK(used>=0));
    ALTER TABLE admin_audit_logs DROP CONSTRAINT admin_audit_logs_action_allowed;
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_action_allowed CHECK(action IN ('USER_INVITED','INVITATION_RESENT','INVITATION_REVOKED','INVITATION_ACCEPTED','USER_ROLE_CHANGED','USER_DISABLED','USER_ENABLED','ADMIN_LOGIN','ADMIN_LOGOUT','ADMIN_SESSION_EXPIRED','CAMPAIGN_CREATED','CAMPAIGN_UPDATED','CAMPAIGN_TEST_SENT','CAMPAIGN_CONFIRMED','CAMPAIGN_SEND_STARTED','CAMPAIGN_SEND_COMPLETED','CAMPAIGN_RETRIED','MANUAL_PAYMENT_RECORDED','MANUAL_PAYMENT_CONFIRMED','MANUAL_PAYMENT_CONFIRMATION_FAILED','PASS_VALIDATED','CHECK_IN_CONFIRMED','CHECK_IN_ALREADY_COMPLETED','MANUAL_ATTENDEE_LOOKUP','CHECK_IN_DENIED','ACCREDITATION_CREATED','ACCREDITATION_STATUS_CHANGED','CAMPAIGN_SCHEDULED','CAMPAIGN_CANCELLED','CONTACT_IMPORTED','CONTACT_CONSENT_CHANGED','CONTACT_SUPPRESSED'));
    ALTER TABLE admin_audit_logs DROP CONSTRAINT admin_audit_logs_entity_type_allowed;
    ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_entity_type_allowed CHECK(entity_type IN ('ADMIN_USER','ADMIN_INVITATION','COMMUNICATION_CAMPAIGN','PAYMENT_TRANSACTION','EVENT_PASS','EVENT_ACCREDITATION','COMMUNICATION_CONTACT'));
  `);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // Consent, suppression and campaign history must not be silently discarded.
  throw new Error(
    "Communications safety migration requires a reviewed data-preserving rollback",
  );
}
