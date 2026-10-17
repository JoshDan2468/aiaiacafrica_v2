import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("communication_manual_contacts", {
    id: { type: "uuid", primaryKey: true },
    name: { type: "varchar(200)", notNull: true },
    email: { type: "varchar(254)", notNull: true, unique: true },
    organization: { type: "varchar(200)" },
    country: { type: "varchar(100)" },
    origin: { type: "varchar(16)", notNull: true },
    status: { type: "varchar(16)", notNull: true, default: "ACTIVE" },
    created_by_admin_id: {
      type: "uuid",
      references: '"admins"',
      onDelete: "SET NULL",
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
    "communication_manual_contacts",
    "communication_manual_contacts_valid",
    {
      check:
        "length(btrim(name)) > 0 AND email = lower(btrim(email)) AND length(email) > 3 " +
        "AND origin IN ('MANUAL','IMPORT') AND status IN ('ACTIVE','INACTIVE')",
    },
  );
  pgm.createIndex("communication_manual_contacts", ["origin", "created_at"], {
    name: "IDX_communication_manual_contacts_origin_created",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("communication_manual_contacts");
}
