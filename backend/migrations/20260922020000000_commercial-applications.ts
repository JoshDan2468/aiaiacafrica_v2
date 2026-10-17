import type { MigrationBuilder } from "node-pg-migrate";

const applicationStatuses =
  "('SUBMITTED', 'MORE_INFORMATION_REQUIRED', 'CONFIRMED', 'DECLINED')";
const historyActions =
  "('SUBMITTED', 'MORE_INFORMATION_REQUIRED', 'CONFIRMED', 'DECLINED')";

function createPackageTables(pgm: MigrationBuilder): void {
  pgm.createTable("sponsorship_packages", {
    id: { type: "uuid", primaryKey: true },
    event_year: { type: "smallint", notNull: true, default: 2027 },
    code: { type: "varchar(32)", notNull: true },
    name: { type: "varchar(100)", notNull: true },
    currency: { type: "char(3)", notNull: true, default: "USD" },
    price_minor: { type: "bigint", notNull: true },
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
  pgm.addConstraint(
    "sponsorship_packages",
    "sponsorship_packages_identity_unique",
    {
      unique: ["event_year", "code"],
    },
  );
  pgm.addConstraint(
    "sponsorship_packages",
    "sponsorship_packages_values_valid",
    {
      check:
        "event_year BETWEEN 2027 AND 2100 AND currency = 'USD' AND price_minor > 0",
    },
  );

  pgm.createTable("exhibition_packages", {
    id: { type: "uuid", primaryKey: true },
    event_year: { type: "smallint", notNull: true, default: 2027 },
    code: { type: "varchar(32)", notNull: true },
    name: { type: "varchar(100)", notNull: true },
    area_sqm: { type: "smallint", notNull: true },
    currency: { type: "char(3)", notNull: true, default: "USD" },
    price_minor: { type: "bigint", notNull: true },
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
  pgm.addConstraint(
    "exhibition_packages",
    "exhibition_packages_identity_unique",
    {
      unique: ["event_year", "code"],
    },
  );
  pgm.addConstraint("exhibition_packages", "exhibition_packages_values_valid", {
    check:
      "event_year BETWEEN 2027 AND 2100 AND area_sqm IN (9, 18, 36) AND currency = 'USD' AND price_minor > 0",
  });

  pgm.sql(`
    INSERT INTO sponsorship_packages (id, event_year, code, name, currency, price_minor) VALUES
      ('41000000-0000-4000-8000-000000000001', 2027, 'TITLE', 'Title Sponsor', 'USD', 10000000),
      ('41000000-0000-4000-8000-000000000002', 2027, 'STRATEGIC', 'Strategic Sponsor', 'USD', 7500000),
      ('41000000-0000-4000-8000-000000000003', 2027, 'DIAMOND', 'Diamond Sponsor', 'USD', 5000000),
      ('41000000-0000-4000-8000-000000000004', 2027, 'PLATINUM', 'Platinum Sponsor', 'USD', 4000000),
      ('41000000-0000-4000-8000-000000000005', 2027, 'GOLD', 'Gold Sponsor', 'USD', 3000000),
      ('41000000-0000-4000-8000-000000000006', 2027, 'SILVER', 'Silver Sponsor', 'USD', 2000000);
    INSERT INTO exhibition_packages (id, event_year, code, name, area_sqm, currency, price_minor) VALUES
      ('42000000-0000-4000-8000-000000000001', 2027, '9_SQM', '9 sqm stand', 9, 'USD', 699000),
      ('42000000-0000-4000-8000-000000000002', 2027, '18_SQM', '18 sqm stand', 18, 'USD', 1398000),
      ('42000000-0000-4000-8000-000000000003', 2027, '36_SQM', '36 sqm stand', 36, 'USD', 2796000);
  `);
}

function createApplicationFamily(
  pgm: MigrationBuilder,
  prefix: "sponsor" | "exhibitor",
  packageTable: "sponsorship_packages" | "exhibition_packages",
): void {
  const applications = `${prefix}_applications`;
  const history = `${prefix}_application_history`;
  const notifications = `${prefix}_application_notifications`;

  pgm.createTable(applications, {
    id: { type: "uuid", primaryKey: true },
    reference: { type: "varchar(32)", notNull: true, unique: true },
    event_year: { type: "smallint", notNull: true, default: 2027 },
    package_id: {
      type: "uuid",
      notNull: true,
      references: `"${packageTable}"`,
      onDelete: "RESTRICT",
    },
    package_code_snapshot: { type: "varchar(32)", notNull: true },
    package_name_snapshot: { type: "varchar(100)", notNull: true },
    currency_snapshot: { type: "char(3)", notNull: true },
    price_minor_snapshot: { type: "bigint", notNull: true },
    organization_name: { type: "varchar(200)", notNull: true },
    country: { type: "varchar(100)", notNull: true },
    website: { type: "varchar(500)" },
    industry: { type: "varchar(150)" },
    contact_first_name: { type: "varchar(100)", notNull: true },
    contact_last_name: { type: "varchar(100)", notNull: true },
    contact_email: { type: "varchar(254)", notNull: true },
    contact_phone: { type: "varchar(40)", notNull: true },
    contact_job_title: { type: "varchar(150)" },
    applicant_notes: { type: "varchar(2000)" },
    consent: { type: "boolean", notNull: true },
    status: { type: "varchar(32)", notNull: true, default: "SUBMITTED" },
    current_applicant_reason: { type: "varchar(1000)" },
    reviewed_at: { type: "timestamptz" },
    reviewed_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
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
  pgm.addConstraint(applications, `${applications}_reference_valid`, {
    check: `reference ~ '^AIAIAC-${prefix === "sponsor" ? "SPN" : "EXH"}-[A-Z0-9]{8}$'`,
  });
  pgm.addConstraint(applications, `${applications}_status_allowed`, {
    check: `status IN ${applicationStatuses}`,
  });
  pgm.addConstraint(applications, `${applications}_snapshot_valid`, {
    check:
      "event_year BETWEEN 2027 AND 2100 AND currency_snapshot = 'USD' AND price_minor_snapshot > 0 AND consent = true",
  });
  pgm.addConstraint(applications, `${applications}_review_consistent`, {
    check:
      "(status = 'SUBMITTED' AND reviewed_at IS NULL AND reviewed_by_admin_id IS NULL) OR " +
      "(status <> 'SUBMITTED' AND reviewed_at IS NOT NULL AND reviewed_by_admin_id IS NOT NULL)",
  });
  pgm.addConstraint(applications, `${applications}_duplicate_guard`, {
    unique: ["event_year", "package_id", "contact_email"],
  });
  pgm.createIndex(applications, ["status", "created_at"], {
    name: `IDX_${applications}_queue`,
  });
  pgm.createIndex(applications, "organization_name", {
    name: `IDX_${applications}_organization`,
  });

  pgm.createTable(history, {
    id: { type: "uuid", primaryKey: true },
    application_id: {
      type: "uuid",
      notNull: true,
      references: `"${applications}"`,
      onDelete: "CASCADE",
    },
    action: { type: "varchar(32)", notNull: true },
    from_status: { type: "varchar(32)" },
    to_status: { type: "varchar(32)", notNull: true },
    admin_id: { type: "uuid", references: '"admins"', onDelete: "RESTRICT" },
    applicant_reason: { type: "varchar(1000)" },
    internal_note: { type: "varchar(1000)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(history, `${history}_values_valid`, {
    check: `action IN ${historyActions} AND to_status IN ${applicationStatuses} AND (from_status IS NULL OR from_status IN ${applicationStatuses})`,
  });
  pgm.addConstraint(history, `${history}_actor_valid`, {
    check:
      "(action = 'SUBMITTED' AND admin_id IS NULL AND from_status IS NULL) OR " +
      "(action <> 'SUBMITTED' AND admin_id IS NOT NULL AND from_status IS NOT NULL)",
  });
  pgm.addConstraint(history, `${history}_reason_valid`, {
    check:
      "action NOT IN ('MORE_INFORMATION_REQUIRED', 'DECLINED') OR " +
      "(applicant_reason IS NOT NULL AND char_length(btrim(applicant_reason)) BETWEEN 10 AND 1000)",
  });
  pgm.createIndex(history, ["application_id", "created_at"], {
    name: `IDX_${history}_timeline`,
  });

  pgm.createTable(notifications, {
    id: { type: "uuid", primaryKey: true },
    application_id: {
      type: "uuid",
      notNull: true,
      references: `"${applications}"`,
      onDelete: "CASCADE",
    },
    history_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: `"${history}"`,
      onDelete: "CASCADE",
    },
    notification_type: { type: "varchar(32)", notNull: true },
    recipient_email_snapshot: { type: "varchar(254)", notNull: true },
    recipient_name_snapshot: { type: "varchar(200)", notNull: true },
    applicant_reason_snapshot: { type: "varchar(1000)" },
    status: { type: "varchar(16)", notNull: true, default: "PENDING" },
    attempts: { type: "smallint", notNull: true, default: 0 },
    last_attempt_at: { type: "timestamptz" },
    sent_at: { type: "timestamptz" },
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
  pgm.addConstraint(notifications, `${notifications}_type_allowed`, {
    check: `notification_type IN ${historyActions}`,
  });
  pgm.addConstraint(notifications, `${notifications}_status_allowed`, {
    check:
      "status IN ('PENDING', 'SENT', 'FAILED') AND attempts BETWEEN 0 AND 3",
  });
  pgm.createIndex(notifications, ["application_id", "status", "created_at"], {
    name: `IDX_${notifications}_delivery`,
  });
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  createPackageTables(pgm);
  createApplicationFamily(pgm, "sponsor", "sponsorship_packages");
  createApplicationFamily(pgm, "exhibitor", "exhibition_packages");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("exhibitor_application_notifications");
  pgm.dropTable("exhibitor_application_history");
  pgm.dropTable("exhibitor_applications");
  pgm.dropTable("sponsor_application_notifications");
  pgm.dropTable("sponsor_application_history");
  pgm.dropTable("sponsor_applications");
  pgm.dropTable("exhibition_packages");
  pgm.dropTable("sponsorship_packages");
}
