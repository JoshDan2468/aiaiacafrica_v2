import type { MigrationBuilder } from "node-pg-migrate";

const professionalPackageId = "7b1f1c1d-8f18-4d41-9921-4d663958a201";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("delegate_packages", {
    id: { type: "uuid", primaryKey: true },
    slug: { type: "varchar(80)", notNull: true, unique: true },
    name: { type: "varchar(120)", notNull: true },
    delegate_type: { type: "varchar(24)", notNull: true },
    description: { type: "text", notNull: true },
    benefits: { type: "text[]", notNull: true },
    currency: { type: "varchar(3)", notNull: true },
    price_minor: { type: "integer", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
    sales_start_at: { type: "timestamptz" },
    sales_end_at: { type: "timestamptz" },
    capacity: { type: "integer" },
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
  pgm.addConstraint("delegate_packages", "delegate_packages_type_allowed", {
    check: "delegate_type IN ('PROFESSIONAL', 'STUDENT')",
  });
  pgm.addConstraint("delegate_packages", "delegate_packages_name_not_blank", {
    check: "char_length(btrim(name)) >= 2",
  });
  pgm.addConstraint(
    "delegate_packages",
    "delegate_packages_description_not_blank",
    {
      check: "char_length(btrim(description)) >= 2",
    },
  );
  pgm.addConstraint("delegate_packages", "delegate_packages_currency_format", {
    check: "currency ~ '^[A-Z]{3}$'",
  });
  pgm.addConstraint(
    "delegate_packages",
    "delegate_packages_price_nonnegative",
    {
      check: "price_minor >= 0",
    },
  );
  pgm.addConstraint(
    "delegate_packages",
    "delegate_packages_capacity_nonnegative",
    {
      check: "capacity IS NULL OR capacity >= 0",
    },
  );
  pgm.addConstraint("delegate_packages", "delegate_packages_sale_window", {
    check:
      "sales_end_at IS NULL OR sales_start_at IS NULL OR sales_end_at >= sales_start_at",
  });
  pgm.createIndex(
    "delegate_packages",
    ["is_active", "sales_start_at", "sales_end_at"],
    {
      name: "IDX_delegate_packages_public_availability",
    },
  );

  pgm.createTable("delegate_registrations", {
    id: { type: "uuid", primaryKey: true },
    reference: { type: "varchar(32)", notNull: true, unique: true },
    package_id: {
      type: "uuid",
      notNull: true,
      references: '"delegate_packages"',
      onDelete: "RESTRICT",
    },
    first_name: { type: "varchar(100)", notNull: true },
    last_name: { type: "varchar(100)", notNull: true },
    email: { type: "varchar(254)", notNull: true },
    mobile: { type: "varchar(40)", notNull: true },
    telephone: { type: "varchar(40)" },
    job_title: { type: "varchar(150)", notNull: true },
    company_name: { type: "varchar(150)", notNull: true },
    country: { type: "varchar(100)", notNull: true },
    primary_activity: { type: "varchar(200)", notNull: true },
    main_objective: { type: "varchar(1000)", notNull: true },
    heard_about_source: { type: "varchar(200)", notNull: true },
    privacy_consent: { type: "boolean", notNull: true },
    data_sharing_consent: { type: "boolean", notNull: true, default: false },
    registration_status: { type: "varchar(24)", notNull: true },
    payment_status: { type: "varchar(24)", notNull: true },
    package_name_snapshot: { type: "varchar(120)", notNull: true },
    package_type_snapshot: { type: "varchar(24)", notNull: true },
    package_description_snapshot: { type: "text", notNull: true },
    package_benefits_snapshot: { type: "text[]", notNull: true },
    currency_snapshot: { type: "varchar(3)", notNull: true },
    price_minor_snapshot: { type: "integer", notNull: true },
    submitted_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
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
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_reference_format",
    {
      check: "reference ~ '^AIAIAC-DEL-[A-Z0-9]{8}$'",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_email_normalized",
    {
      check: "email = lower(btrim(email))",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_privacy_consent",
    {
      check: "privacy_consent = true",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_status_allowed",
    {
      check:
        "registration_status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_payment_status_allowed",
    {
      check:
        "payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_price_nonnegative",
    {
      check: "price_minor_snapshot >= 0",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_currency_format",
    {
      check: "currency_snapshot ~ '^[A-Z]{3}$'",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_package_type_allowed",
    {
      check: "package_type_snapshot IN ('PROFESSIONAL', 'STUDENT')",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_name_not_blank",
    {
      check:
        "char_length(btrim(first_name)) >= 1 AND char_length(btrim(last_name)) >= 1",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_company_not_blank",
    {
      check: "char_length(btrim(company_name)) >= 1",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_objective_not_blank",
    {
      check: "char_length(btrim(main_objective)) >= 1",
    },
  );
  pgm.addConstraint(
    "delegate_registrations",
    "delegate_registrations_package_email_unique",
    {
      unique: ["package_id", "email"],
    },
  );
  pgm.createIndex("delegate_registrations", "submitted_at", {
    name: "IDX_delegate_registrations_submitted_at",
  });
  pgm.createIndex("delegate_registrations", "package_id", {
    name: "IDX_delegate_registrations_package_id",
  });
  pgm.createIndex(
    "delegate_registrations",
    ["registration_status", "payment_status"],
    {
      name: "IDX_delegate_registrations_statuses",
    },
  );

  pgm.sql(`
    INSERT INTO delegate_packages (
      id, slug, name, delegate_type, description, benefits, currency, price_minor, is_active
    ) VALUES (
      '${professionalPackageId}',
      'professional-delegate',
      'Professional Delegate',
      'PROFESSIONAL',
      'Conference participation for technical specialists, leaders and operational decision-makers.',
      ARRAY[
        'Technical knowledge exchange',
        'Industry peer connections',
        'Expert-led discussion',
        'Technology discovery'
      ],
      'USD',
      100000,
      true
    ) ON CONFLICT (slug) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("delegate_registrations");
  pgm.dropTable("delegate_packages");
}
