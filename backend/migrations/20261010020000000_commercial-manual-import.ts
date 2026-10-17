import type { MigrationBuilder } from "node-pg-migrate";
export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const table of ["sponsor_applications", "exhibitor_applications"])
    pgm.sql(`
    ALTER TABLE ${table} ADD COLUMN origin varchar(16) NOT NULL DEFAULT 'PUBLIC', ADD COLUMN import_source varchar(200), ADD COLUMN approval_evidence varchar(1000);
    ALTER TABLE ${table} DROP CONSTRAINT ${table}_snapshot_valid;
    ALTER TABLE ${table} ADD CONSTRAINT ${table}_snapshot_valid CHECK(event_year BETWEEN 2027 AND 2100 AND currency_snapshot='USD' AND price_minor_snapshot>0 AND ((origin='PUBLIC' AND consent=true AND import_source IS NULL AND approval_evidence IS NULL) OR (origin='MANUAL_IMPORT' AND consent=false AND status='CONFIRMED' AND import_source IS NOT NULL AND approval_evidence IS NOT NULL AND length(btrim(import_source))>=2 AND length(btrim(approval_evidence))>=10)));
    ALTER TABLE ${table.replace("_applications", "_application_history")} DROP CONSTRAINT ${table.replace("_applications", "_application_history")}_actor_valid;
    ALTER TABLE ${table.replace("_applications", "_application_history")} ADD CONSTRAINT ${table.replace("_applications", "_application_history")}_actor_valid CHECK((action='SUBMITTED' AND admin_id IS NULL AND from_status IS NULL) OR (action<>'SUBMITTED' AND admin_id IS NOT NULL AND from_status IS NOT NULL) OR (action='CONFIRMED' AND to_status='CONFIRMED' AND from_status IS NULL AND admin_id IS NOT NULL AND internal_note IS NOT NULL));
  `);
  for (const [constraint, column, value] of [
    [
      "admin_audit_logs_action_allowed",
      "action",
      "COMMERCIAL_APPLICATION_IMPORTED",
    ],
    [
      "admin_audit_logs_entity_type_allowed",
      "entity_type",
      "COMMERCIAL_APPLICATION",
    ],
  ] as const)
    pgm.sql(
      `DO $$ DECLARE original text; BEGIN SELECT pg_get_expr(conbin,conrelid) INTO STRICT original FROM pg_constraint WHERE conname='${constraint}' AND conrelid='admin_audit_logs'::regclass; ALTER TABLE admin_audit_logs DROP CONSTRAINT ${constraint}; EXECUTE format('ALTER TABLE admin_audit_logs ADD CONSTRAINT ${constraint} CHECK ((%s) OR ${column} = %L)', original, '${value}'); END $$;`,
    );
}
export async function down(): Promise<void> {
  throw new Error(
    "Manual approval imports and audit history must be preserved; rollback requires a reviewed data recovery plan.",
  );
}
