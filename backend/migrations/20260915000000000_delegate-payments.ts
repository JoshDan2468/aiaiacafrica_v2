import type { MigrationBuilder } from "node-pg-migrate";

const professionalUsdPriceId = "f7a11889-463b-4f82-a80e-cf2d25c8122c";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Keep the legacy price columns during this transition; new payment code reads this table.
  pgm.createTable("delegate_package_prices", {
    id: { type: "uuid", primaryKey: true },
    package_id: {
      type: "uuid",
      notNull: true,
      references: '"delegate_packages"',
      onDelete: "CASCADE",
    },
    currency: { type: "varchar(3)", notNull: true },
    amount_minor: { type: "integer", notNull: true },
    is_active: { type: "boolean", notNull: true, default: false },
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
    "delegate_package_prices",
    "delegate_package_prices_currency_allowed",
    {
      check: "currency IN ('USD', 'NGN')",
    },
  );
  pgm.addConstraint(
    "delegate_package_prices",
    "delegate_package_prices_amount_positive",
    {
      check: "amount_minor > 0",
    },
  );
  pgm.addConstraint(
    "delegate_package_prices",
    "delegate_package_prices_package_currency_unique",
    {
      unique: ["package_id", "currency"],
    },
  );
  pgm.createIndex("delegate_package_prices", ["package_id", "is_active"], {
    name: "IDX_delegate_package_prices_active",
  });

  pgm.sql(`
    INSERT INTO delegate_package_prices (id, package_id, currency, amount_minor, is_active)
    SELECT '${professionalUsdPriceId}', id, 'USD', 100000, true
    FROM delegate_packages
    WHERE slug = 'professional-delegate'
    ON CONFLICT (package_id, currency)
    DO UPDATE SET amount_minor = EXCLUDED.amount_minor, is_active = true, updated_at = current_timestamp;
  `);

  pgm.createTable("payment_transactions", {
    id: { type: "uuid", primaryKey: true },
    registration_id: {
      type: "uuid",
      notNull: true,
      references: '"delegate_registrations"',
      onDelete: "RESTRICT",
    },
    provider: { type: "varchar(24)", notNull: true },
    provider_reference: { type: "varchar(80)", notNull: true, unique: true },
    provider_transaction_id: { type: "varchar(32)" },
    package_code_snapshot: { type: "varchar(80)", notNull: true },
    customer_email_snapshot: { type: "varchar(254)", notNull: true },
    currency: { type: "varchar(3)", notNull: true },
    amount_minor: { type: "integer", notNull: true },
    status: { type: "varchar(24)", notNull: true },
    authorization_url: { type: "text" },
    access_code: { type: "varchar(120)" },
    channel: { type: "varchar(40)" },
    gateway_response: { type: "varchar(255)" },
    failure_reason: { type: "varchar(80)" },
    confirmation_email_status: {
      type: "varchar(24)",
      notNull: true,
      default: "NOT_QUEUED",
    },
    confirmation_email_sent_at: { type: "timestamptz" },
    paid_at: { type: "timestamptz" },
    verified_at: { type: "timestamptz" },
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
    "payment_transactions",
    "payment_transactions_provider_allowed",
    {
      check: "provider IN ('PAYSTACK')",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_reference_format",
    {
      check: "provider_reference ~ '^AIAIAC-PAY-[A-Z0-9]{24}$'",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_currency_allowed",
    {
      check: "currency IN ('USD', 'NGN')",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_amount_positive",
    {
      check: "amount_minor > 0",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_status_allowed",
    {
      check:
        "status IN ('INITIALIZED', 'PENDING', 'PAID', 'FAILED', 'ABANDONED', 'REVERSED')",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_email_status_allowed",
    {
      check:
        "confirmation_email_status IN ('NOT_QUEUED', 'PENDING', 'SENT', 'FAILED')",
    },
  );
  pgm.addConstraint(
    "payment_transactions",
    "payment_transactions_email_normalized",
    {
      check: "customer_email_snapshot = lower(btrim(customer_email_snapshot))",
    },
  );
  pgm.createIndex("payment_transactions", ["registration_id", "created_at"], {
    name: "IDX_payment_transactions_registration",
  });
  pgm.createIndex(
    "payment_transactions",
    ["status", "currency", "created_at"],
    {
      name: "IDX_payment_transactions_admin_filters",
    },
  );
  pgm.sql(`
    CREATE UNIQUE INDEX "IDX_payment_transactions_one_active_registration"
      ON payment_transactions (registration_id)
      WHERE status IN ('INITIALIZED', 'PENDING');
    CREATE UNIQUE INDEX "IDX_payment_transactions_provider_transaction"
      ON payment_transactions (provider, provider_transaction_id)
      WHERE provider_transaction_id IS NOT NULL;
  `);

  pgm.createTable("payment_events", {
    id: { type: "uuid", primaryKey: true },
    payment_transaction_id: {
      type: "uuid",
      notNull: true,
      references: '"payment_transactions"',
      onDelete: "CASCADE",
    },
    event_type: { type: "varchar(48)", notNull: true },
    details: { type: "jsonb", notNull: true, default: "{}" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("payment_events", "payment_events_type_allowed", {
    check:
      "event_type IN ('PAYMENT_INITIALIZED', 'PAYMENT_CONFIRMED', 'PAYMENT_VERIFICATION_FAILED')",
  });
  pgm.addConstraint("payment_events", "payment_events_once_per_type", {
    unique: ["payment_transaction_id", "event_type"],
  });
  pgm.createIndex("payment_events", ["payment_transaction_id", "created_at"], {
    name: "IDX_payment_events_transaction",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("payment_events");
  pgm.dropTable("payment_transactions");
  pgm.dropTable("delegate_package_prices");
}
