import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const [name, expression] of [
    ["provider_allowed", "provider IN ('PAYSTACK','FLUTTERWAVE','MANUAL')"],
    ["source_allowed", "payment_source IN ('PAYSTACK','FLUTTERWAVE','MANUAL')"],
    [
      "method_allowed",
      "payment_method IN ('PAYSTACK','FLUTTERWAVE','BANK_TRANSFER','OFFLINE')",
    ],
    [
      "manual_fields_consistent",
      `(provider IN ('PAYSTACK', 'FLUTTERWAVE') AND payment_source = provider AND payment_method = provider
        AND external_reference IS NULL AND recorded_by_admin_id IS NULL
        AND confirmed_by_admin_id IS NULL AND confirmed_at IS NULL)
      OR
      (payment_source = 'MANUAL' AND provider = 'MANUAL'
        AND payment_method IN ('BANK_TRANSFER', 'OFFLINE')
        AND external_reference IS NOT NULL AND payment_date IS NOT NULL
        AND recorded_by_admin_id IS NOT NULL
        AND (
          (status = 'PENDING_CONFIRMATION' AND financial_authority = 'UNRESOLVED'
            AND confirmed_by_admin_id IS NULL AND confirmed_at IS NULL)
          OR
          (status = 'PAID' AND financial_authority = 'AUTHORITATIVE'
            AND confirmed_by_admin_id IS NOT NULL AND confirmed_at IS NOT NULL)
        ))`,
    ],
  ]) {
    pgm.dropConstraint("payment_transactions", `payment_transactions_${name}`);
    pgm.addConstraint("payment_transactions", `payment_transactions_${name}`, {
      check: expression!,
    });
  }
}
export async function down(pgm: MigrationBuilder): Promise<void> {
  // Refuse rollback while Flutterwave history exists; never delete financial records.
  pgm.sql(
    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM payment_transactions WHERE provider='FLUTTERWAVE') THEN RAISE EXCEPTION 'Flutterwave transactions prevent rollback'; END IF; END $$;",
  );
  for (const [name, expression] of [
    ["provider_allowed", "provider IN ('PAYSTACK','MANUAL')"],
    ["source_allowed", "payment_source IN ('PAYSTACK','MANUAL')"],
    [
      "method_allowed",
      "payment_method IN ('PAYSTACK','BANK_TRANSFER','OFFLINE')",
    ],
    [
      "manual_fields_consistent",
      `(payment_source = 'PAYSTACK' AND provider = 'PAYSTACK' AND payment_method = 'PAYSTACK'
        AND external_reference IS NULL AND recorded_by_admin_id IS NULL
        AND confirmed_by_admin_id IS NULL AND confirmed_at IS NULL)
      OR
      (payment_source = 'MANUAL' AND provider = 'MANUAL'
        AND payment_method IN ('BANK_TRANSFER', 'OFFLINE')
        AND external_reference IS NOT NULL AND payment_date IS NOT NULL
        AND recorded_by_admin_id IS NOT NULL
        AND (
          (status = 'PENDING_CONFIRMATION' AND financial_authority = 'UNRESOLVED'
            AND confirmed_by_admin_id IS NULL AND confirmed_at IS NULL)
          OR
          (status = 'PAID' AND financial_authority = 'AUTHORITATIVE'
            AND confirmed_by_admin_id IS NOT NULL AND confirmed_at IS NOT NULL)
        ))`,
    ],
  ]) {
    pgm.dropConstraint("payment_transactions", `payment_transactions_${name}`);
    pgm.addConstraint("payment_transactions", `payment_transactions_${name}`, {
      check: expression!,
    });
  }
}
