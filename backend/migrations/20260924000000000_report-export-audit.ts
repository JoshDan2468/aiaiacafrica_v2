import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("report_export_audit", {
    id: { type: "uuid", primaryKey: true },
    admin_id: {
      type: "uuid",
      notNull: true,
      references: '"admins"',
      onDelete: "RESTRICT",
    },
    report_type: { type: "varchar(24)", notNull: true },
    format: { type: "varchar(8)", notNull: true },
    filters: { type: "jsonb", notNull: true, default: pgm.func("'{}'::jsonb") },
    generated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("report_export_audit", "report_export_audit_type_valid", {
    check:
      "report_type IN ('DELEGATES','STUDENTS','PAYMENTS','SPONSORS','EXHIBITORS','ABSTRACTS','ENQUIRIES')",
  });
  pgm.addConstraint("report_export_audit", "report_export_audit_format_valid", {
    check: "format='CSV'",
  });
  pgm.createIndex("report_export_audit", ["admin_id", "generated_at"], {
    name: "IDX_report_export_audit_actor_time",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("report_export_audit");
}
