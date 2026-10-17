import type { MigrationBuilder } from "node-pg-migrate";

const studentPackageId = "9f54a313-4132-4c15-9177-4c2e83f083b1";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Student applications intentionally have no price snapshot until management approves pricing.
  pgm.alterColumn("delegate_packages", "currency", { notNull: false });
  pgm.alterColumn("delegate_packages", "price_minor", { notNull: false });
  pgm.alterColumn("delegate_registrations", "currency_snapshot", {
    notNull: false,
  });
  pgm.alterColumn("delegate_registrations", "price_minor_snapshot", {
    notNull: false,
  });

  pgm.sql(`
    INSERT INTO delegate_packages (
      id, slug, name, delegate_type, description, benefits,
      currency, price_minor, is_active
    ) VALUES (
      '${studentPackageId}',
      'student-delegate',
      'Student Delegate',
      'STUDENT',
      'Conference participation for currently enrolled students, subject to Student status verification.',
      ARRAY[
        'Student-focused conference participation',
        'Technical knowledge exchange',
        'Industry and academic connections',
        'Access to the innovation showcase'
      ],
      NULL,
      NULL,
      true
    ) ON CONFLICT (slug) DO NOTHING;
  `);

  pgm.createTable("student_verifications", {
    id: { type: "uuid", primaryKey: true },
    registration_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: '"delegate_registrations"',
      onDelete: "CASCADE",
    },
    institution_name: { type: "varchar(200)", notNull: true },
    institution_country: { type: "varchar(100)", notNull: true },
    programme_of_study: { type: "varchar(200)", notNull: true },
    student_identification_number: { type: "varchar(100)", notNull: true },
    expected_graduation_year: { type: "smallint", notNull: true },
    institutional_email: { type: "varchar(254)" },
    status: { type: "varchar(32)", notNull: true, default: "NOT_SUBMITTED" },
    submitted_at: { type: "timestamptz" },
    reviewed_at: { type: "timestamptz" },
    reviewed_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    review_note: { type: "varchar(1000)" },
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
    "student_verifications",
    "student_verifications_status_allowed",
    {
      check:
        "status IN ('NOT_SUBMITTED', 'PENDING', 'MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED')",
    },
  );
  pgm.addConstraint(
    "student_verifications",
    "student_verifications_academic_fields_not_blank",
    {
      check:
        "char_length(btrim(institution_name)) >= 2 AND " +
        "char_length(btrim(institution_country)) >= 2 AND " +
        "char_length(btrim(programme_of_study)) >= 2 AND " +
        "char_length(btrim(student_identification_number)) >= 2",
    },
  );
  pgm.addConstraint(
    "student_verifications",
    "student_verifications_graduation_year_valid",
    { check: "expected_graduation_year BETWEEN 2026 AND 2100" },
  );
  pgm.addConstraint(
    "student_verifications",
    "student_verifications_institutional_email_normalized",
    {
      check:
        "institutional_email IS NULL OR institutional_email = lower(btrim(institutional_email))",
    },
  );
  pgm.addConstraint(
    "student_verifications",
    "student_verifications_submission_state_consistent",
    {
      check:
        "(status = 'NOT_SUBMITTED' AND submitted_at IS NULL) OR " +
        "(status <> 'NOT_SUBMITTED' AND submitted_at IS NOT NULL)",
    },
  );
  pgm.addConstraint(
    "student_verifications",
    "student_verifications_review_state_consistent",
    {
      check:
        "(status IN ('NOT_SUBMITTED', 'PENDING') AND reviewed_at IS NULL AND reviewed_by_admin_id IS NULL) OR " +
        "(status IN ('MORE_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED') AND " +
        "reviewed_at IS NOT NULL AND reviewed_by_admin_id IS NOT NULL)",
    },
  );
  pgm.createIndex("student_verifications", ["status", "created_at"], {
    name: "IDX_student_verifications_queue",
  });

  pgm.createTable("student_verification_events", {
    id: { type: "uuid", primaryKey: true },
    student_verification_id: {
      type: "uuid",
      notNull: true,
      references: '"student_verifications"',
      onDelete: "CASCADE",
    },
    event_type: { type: "varchar(48)", notNull: true },
    admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    details: { type: "jsonb", notNull: true, default: "{}" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "student_verification_events",
    "student_verification_events_type_allowed",
    {
      check:
        "event_type IN ('STUDENT_APPLICATION_CREATED', 'STUDENT_VERIFICATION_SUBMITTED', " +
        "'STUDENT_MORE_INFORMATION_REQUIRED', 'STUDENT_VERIFICATION_APPROVED', " +
        "'STUDENT_VERIFICATION_REJECTED')",
    },
  );
  pgm.createIndex(
    "student_verification_events",
    ["student_verification_id", "created_at"],
    { name: "IDX_student_verification_events_history" },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("student_verification_events");
  pgm.dropTable("student_verifications");
  pgm.sql(`
    DELETE FROM delegate_registrations WHERE package_id = '${studentPackageId}';
    DELETE FROM delegate_packages WHERE id = '${studentPackageId}';
  `);
  pgm.alterColumn("delegate_registrations", "price_minor_snapshot", {
    notNull: true,
  });
  pgm.alterColumn("delegate_registrations", "currency_snapshot", {
    notNull: true,
  });
  pgm.alterColumn("delegate_packages", "price_minor", { notNull: true });
  pgm.alterColumn("delegate_packages", "currency", { notNull: true });
}
