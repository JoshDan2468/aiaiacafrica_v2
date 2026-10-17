import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("admins", {
    id: { type: "uuid", primaryKey: true },
    full_name: { type: "varchar(100)", notNull: true },
    email: { type: "varchar(254)", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    role: { type: "varchar(32)", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
    last_login_at: { type: "timestamptz" },
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
  pgm.addConstraint("admins", "admins_full_name_not_blank", {
    check: "char_length(btrim(full_name)) >= 2",
  });
  pgm.addConstraint("admins", "admins_email_normalized", {
    check: "email = lower(btrim(email))",
  });
  pgm.addConstraint("admins", "admins_role_allowed", {
    check: "role IN ('SUPER_ADMIN', 'ADMIN')",
  });

  // This is the documented connect-pg-simple schema. Runtime table creation is disabled.
  pgm.createTable("session", {
    sid: { type: "varchar", primaryKey: true },
    sess: { type: "json", notNull: true },
    expire: { type: "timestamptz", notNull: true },
  });
  pgm.createIndex("session", "expire", { name: "IDX_session_expire" });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("session");
  pgm.dropTable("admins");
}
