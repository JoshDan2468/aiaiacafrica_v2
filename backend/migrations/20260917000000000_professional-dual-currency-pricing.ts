import type { MigrationBuilder } from "node-pg-migrate";

const professionalNgnPriceId = "a8250195-dc69-47bb-bae8-292f342d8d62";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Current package prices change here; historical payment snapshots are intentionally untouched.
  pgm.sql(`
    UPDATE delegate_package_prices AS price
    SET amount_minor = 150000,
        is_active = true,
        updated_at = current_timestamp
    FROM delegate_packages AS package
    WHERE price.package_id = package.id
      AND package.slug = 'professional-delegate'
      AND price.currency = 'USD';

    INSERT INTO delegate_package_prices (
      id, package_id, currency, amount_minor, is_active
    )
    SELECT '${professionalNgnPriceId}', id, 'NGN', 210000000, true
    FROM delegate_packages
    WHERE slug = 'professional-delegate'
    ON CONFLICT (package_id, currency)
    DO UPDATE SET
      amount_minor = EXCLUDED.amount_minor,
      is_active = true,
      updated_at = current_timestamp;

    UPDATE delegate_packages
    SET currency = 'USD',
        price_minor = 150000,
        updated_at = current_timestamp
    WHERE slug = 'professional-delegate';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM delegate_package_prices AS price
    USING delegate_packages AS package
    WHERE price.package_id = package.id
      AND package.slug = 'professional-delegate'
      AND price.currency = 'NGN';

    UPDATE delegate_package_prices AS price
    SET amount_minor = 100000,
        is_active = true,
        updated_at = current_timestamp
    FROM delegate_packages AS package
    WHERE price.package_id = package.id
      AND package.slug = 'professional-delegate'
      AND price.currency = 'USD';

    UPDATE delegate_packages
    SET currency = 'USD',
        price_minor = 100000,
        updated_at = current_timestamp
    WHERE slug = 'professional-delegate';
  `);
}
