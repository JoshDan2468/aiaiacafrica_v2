import type { MigrationBuilder } from "node-pg-migrate";

const eventId = "a1a1ac27-2027-4a1a-8a1a-000000000001";
const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE",
  "REGISTRATION_MANAGER",
  "COMMUNICATIONS",
];
const priorActions = [
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
  "PASS_VALIDATED",
  "CHECK_IN_CONFIRMED",
  "CHECK_IN_ALREADY_COMPLETED",
  "MANUAL_ATTENDEE_LOOKUP",
  "CHECK_IN_DENIED",
];
const quoted = (values: readonly string[]) =>
  values.map((value) => `'${value}'`).join(", ");

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const table of ["admins", "admin_invitations"]) {
    pgm.dropConstraint(table, `${table}_role_allowed`);
    pgm.addConstraint(table, `${table}_role_allowed`, {
      check: `role IN (${quoted([...roles, "CHECK_IN_STAFF"])})`,
    });
  }

  pgm.createTable("conference_events", {
    id: { type: "uuid", primaryKey: true },
    code: { type: "varchar(40)", notNull: true, unique: true },
    name: { type: "varchar(160)", notNull: true },
    event_year: { type: "smallint", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
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
  pgm.addConstraint("conference_events", "conference_events_year_valid", {
    check: "event_year BETWEEN 2027 AND 2100",
  });
  pgm.sql(`INSERT INTO conference_events (id,code,name,event_year)
    VALUES ('${eventId}','AIAIAC-AFRICA-2027','AIAIAC Africa 2027',2027)
    ON CONFLICT (code) DO NOTHING`);

  pgm.createTable("event_accreditations", {
    id: { type: "uuid", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: '"conference_events"',
      onDelete: "RESTRICT",
    },
    category: { type: "varchar(40)", notNull: true },
    full_name: { type: "varchar(160)", notNull: true },
    email: { type: "varchar(254)", notNull: true },
    organization_name: { type: "varchar(160)" },
    country: { type: "varchar(100)" },
    status: { type: "varchar(16)", notNull: true },
    source_type: { type: "varchar(32)", notNull: true },
    delegate_registration_id: {
      type: "uuid",
      references: '"delegate_registrations"',
      onDelete: "RESTRICT",
    },
    sponsor_application_id: {
      type: "uuid",
      references: '"sponsor_applications"',
      onDelete: "RESTRICT",
    },
    exhibitor_application_id: {
      type: "uuid",
      references: '"exhibitor_applications"',
      onDelete: "RESTRICT",
    },
    created_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    approved_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    approved_at: { type: "timestamptz" },
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
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_category_allowed",
    {
      check: `category IN (${quoted([
        "PROFESSIONAL_DELEGATE",
        "STUDENT_DELEGATE",
        "SPONSOR_REPRESENTATIVE",
        "EXHIBITOR_REPRESENTATIVE",
        "SPEAKER",
        "MEDIA_PRESS",
        "PARTNER",
        "VIP_GUEST",
        "COMMITTEE_ORGANIZER",
        "STAFF_VOLUNTEER",
      ])})`,
    },
  );
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_email_normalized",
    {
      check: "email = lower(btrim(email))",
    },
  );
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_identity_valid",
    {
      check:
        "char_length(btrim(full_name)) >= 2 AND char_length(btrim(email)) >= 3",
    },
  );
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_source_consistent",
    {
      check: `(
      (category IN ('PROFESSIONAL_DELEGATE','STUDENT_DELEGATE')
        AND source_type='DELEGATE_REGISTRATION' AND status='LINKED'
        AND delegate_registration_id IS NOT NULL AND sponsor_application_id IS NULL
        AND exhibitor_application_id IS NULL AND created_by_admin_id IS NULL)
      OR (category='SPONSOR_REPRESENTATIVE' AND source_type='SPONSOR_APPLICATION'
        AND status IN ('PENDING','REVOKED') AND sponsor_application_id IS NOT NULL
        AND delegate_registration_id IS NULL AND exhibitor_application_id IS NULL
        AND created_by_admin_id IS NOT NULL)
      OR (category='EXHIBITOR_REPRESENTATIVE' AND source_type='EXHIBITOR_APPLICATION'
        AND status IN ('PENDING','REVOKED') AND exhibitor_application_id IS NOT NULL
        AND delegate_registration_id IS NULL AND sponsor_application_id IS NULL
        AND created_by_admin_id IS NOT NULL)
      OR (category IN ('SPEAKER','MEDIA_PRESS','PARTNER','VIP_GUEST',
                      'COMMITTEE_ORGANIZER','STAFF_VOLUNTEER')
        AND source_type='ADMIN_INTAKE' AND status IN ('PENDING','APPROVED','REVOKED')
        AND delegate_registration_id IS NULL AND sponsor_application_id IS NULL
        AND exhibitor_application_id IS NULL AND created_by_admin_id IS NOT NULL)
    )`,
    },
  );
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_approval_consistent",
    {
      check:
        "status <> 'APPROVED' OR (approved_at IS NOT NULL AND approved_by_admin_id IS NOT NULL)",
    },
  );
  pgm.addConstraint(
    "event_accreditations",
    "event_accreditations_delegate_unique",
    {
      unique: ["event_id", "delegate_registration_id"],
    },
  );
  pgm.createIndex("event_accreditations", ["event_id", "category", "status"], {
    name: "IDX_event_accreditations_filters",
  });
  pgm.sql(`CREATE UNIQUE INDEX "IDX_event_accreditations_representative_person"
    ON event_accreditations (event_id,email)
    WHERE category IN ('SPONSOR_REPRESENTATIVE','EXHIBITOR_REPRESENTATIVE');
    CREATE UNIQUE INDEX "IDX_event_accreditations_manual_person"
    ON event_accreditations (event_id,category,email)
    WHERE source_type='ADMIN_INTAKE';`);

  // Identity snapshot and linkage only. Existing registration, payment, pass and admission rows stay untouched.
  pgm.sql(`INSERT INTO event_accreditations
    (id,event_id,category,full_name,email,organization_name,country,status,source_type,
     delegate_registration_id,created_at,updated_at)
    SELECT gen_random_uuid(),'${eventId}',
      CASE dr.package_type_snapshot WHEN 'STUDENT' THEN 'STUDENT_DELEGATE'
           ELSE 'PROFESSIONAL_DELEGATE' END,
      concat_ws(' ',dr.first_name,dr.last_name),dr.email,dr.company_name,dr.country,
      'LINKED','DELEGATE_REGISTRATION',dr.id,dr.created_at,dr.updated_at
    FROM delegate_registrations dr
    WHERE dr.package_type_snapshot IN ('PROFESSIONAL','STUDENT')
    ON CONFLICT (event_id,delegate_registration_id) DO NOTHING`);

  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: `action IN (${quoted([...priorActions, "ACCREDITATION_CREATED", "ACCREDITATION_STATUS_CHANGED"])})`,
  });
  pgm.dropConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
  );
  pgm.addConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
    {
      check: `entity_type IN ('ADMIN_USER','ADMIN_INVITATION','COMMUNICATION_CAMPAIGN',
                           'PAYMENT_TRANSACTION','EVENT_PASS','EVENT_ACCREDITATION')`,
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("event_accreditations");
  pgm.dropTable("conference_events");
  pgm.dropConstraint("admin_audit_logs", "admin_audit_logs_action_allowed");
  pgm.addConstraint("admin_audit_logs", "admin_audit_logs_action_allowed", {
    check: `action IN (${quoted(priorActions)})`,
  });
  pgm.dropConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
  );
  pgm.addConstraint(
    "admin_audit_logs",
    "admin_audit_logs_entity_type_allowed",
    {
      check: `entity_type IN ('ADMIN_USER','ADMIN_INVITATION','COMMUNICATION_CAMPAIGN',
                           'PAYMENT_TRANSACTION','EVENT_PASS')`,
    },
  );
  for (const table of ["admins", "admin_invitations"]) {
    pgm.dropConstraint(table, `${table}_role_allowed`);
    pgm.addConstraint(table, `${table}_role_allowed`, {
      check: `role IN (${quoted(roles)})`,
    });
  }
}
