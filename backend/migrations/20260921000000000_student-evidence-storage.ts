import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns("student_verifications", {
    continuation_token_hash: { type: "char(64)" },
    continuation_token_expires_at: { type: "timestamptz" },
  });
  pgm.addConstraint(
    "student_verifications",
    "student_verifications_continuation_token_consistent",
    {
      check:
        "(continuation_token_hash IS NULL AND continuation_token_expires_at IS NULL) OR " +
        "(continuation_token_hash ~ '^[0-9a-f]{64}$' AND continuation_token_expires_at IS NOT NULL)",
    },
  );
  pgm.createIndex("student_verifications", "continuation_token_hash", {
    name: "IDX_student_verifications_continuation_token_hash",
    unique: true,
    where: "continuation_token_hash IS NOT NULL",
  });

  pgm.createTable("student_evidence_documents", {
    id: { type: "uuid", primaryKey: true },
    public_id: { type: "uuid", notNull: true, unique: true },
    student_verification_id: {
      type: "uuid",
      notNull: true,
      references: '"student_verifications"',
      onDelete: "CASCADE",
    },
    evidence_type: { type: "varchar(64)", notNull: true },
    evidence_category: { type: "varchar(16)", notNull: true },
    original_display_filename: { type: "varchar(180)", notNull: true },
    storage_key: { type: "varchar(255)", notNull: true, unique: true },
    detected_mime_type: { type: "varchar(32)", notNull: true },
    size_bytes: { type: "integer", notNull: true },
    sha256_checksum: { type: "char(64)", notNull: true },
    scan_status: { type: "varchar(16)", notNull: true, default: "PENDING" },
    document_status: {
      type: "varchar(16)",
      notNull: true,
      default: "PENDING_SCAN",
    },
    supersedes_evidence_id: {
      type: "uuid",
      references: '"student_evidence_documents"',
      onDelete: "RESTRICT",
    },
    superseded_at: { type: "timestamptz" },
    uploaded_at: {
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
    "student_evidence_documents",
    "student_evidence_documents_type_allowed",
    {
      check:
        "evidence_type IN ('CURRENT_STUDENT_ID', 'COURSE_REGISTRATION', " +
        "'ENROLMENT_LETTER', 'TUITION_OR_SCHOOL_FEE_RECEIPT', " +
        "'TRANSCRIPT_OR_ENROLMENT_STATEMENT', 'OTHER_INSTITUTIONAL_ENROLMENT_EVIDENCE')",
    },
  );
  pgm.addConstraint(
    "student_evidence_documents",
    "student_evidence_documents_category_consistent",
    {
      check:
        "(evidence_type = 'CURRENT_STUDENT_ID' AND evidence_category = 'STUDENT_ID') OR " +
        "(evidence_type <> 'CURRENT_STUDENT_ID' AND evidence_category = 'ENROLMENT')",
    },
  );
  pgm.addConstraint(
    "student_evidence_documents",
    "student_evidence_documents_mime_allowed",
    {
      check:
        "detected_mime_type IN ('application/pdf', 'image/jpeg', 'image/png')",
    },
  );
  pgm.addConstraint(
    "student_evidence_documents",
    "student_evidence_documents_size_valid",
    { check: "size_bytes BETWEEN 1 AND 5242880" },
  );
  pgm.addConstraint(
    "student_evidence_documents",
    "student_evidence_documents_checksum_valid",
    { check: "sha256_checksum ~ '^[0-9a-f]{64}$'" },
  );
  pgm.addConstraint(
    "student_evidence_documents",
    "student_evidence_documents_scan_status_allowed",
    {
      check:
        "scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'UNAVAILABLE', 'ERROR')",
    },
  );
  pgm.addConstraint(
    "student_evidence_documents",
    "student_evidence_documents_status_allowed",
    { check: "document_status IN ('PENDING_SCAN', 'AVAILABLE', 'REJECTED')" },
  );
  pgm.addConstraint(
    "student_evidence_documents",
    "student_evidence_documents_lifecycle_consistent",
    {
      check:
        "(document_status = 'AVAILABLE' AND scan_status = 'CLEAN') OR " +
        "(document_status = 'REJECTED' AND scan_status = 'INFECTED') OR " +
        "(document_status = 'PENDING_SCAN' AND scan_status IN ('PENDING', 'UNAVAILABLE', 'ERROR'))",
    },
  );
  pgm.createIndex(
    "student_evidence_documents",
    ["student_verification_id", "document_status", "uploaded_at"],
    { name: "IDX_student_evidence_documents_verification" },
  );
  pgm.sql(`
    CREATE UNIQUE INDEX "IDX_student_evidence_documents_active_category"
      ON student_evidence_documents (student_verification_id, evidence_category)
      WHERE superseded_at IS NULL;
  `);

  pgm.dropConstraint(
    "student_verification_events",
    "student_verification_events_type_allowed",
  );
  pgm.addConstraint(
    "student_verification_events",
    "student_verification_events_type_allowed",
    {
      check:
        "event_type IN ('STUDENT_APPLICATION_CREATED', 'STUDENT_VERIFICATION_SUBMITTED', " +
        "'STUDENT_MORE_INFORMATION_REQUIRED', 'STUDENT_VERIFICATION_APPROVED', " +
        "'STUDENT_VERIFICATION_REJECTED', 'STUDENT_EVIDENCE_UPLOADED', " +
        "'STUDENT_EVIDENCE_REPLACED', 'STUDENT_EVIDENCE_SCAN_COMPLETED', " +
        "'STUDENT_EVIDENCE_REJECTED', 'STUDENT_EVIDENCE_ACCESSED')",
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint(
    "student_verification_events",
    "student_verification_events_type_allowed",
  );
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
  pgm.dropTable("student_evidence_documents");
  pgm.dropConstraint(
    "student_verifications",
    "student_verifications_continuation_token_consistent",
  );
  pgm.dropColumns("student_verifications", [
    "continuation_token_hash",
    "continuation_token_expires_at",
  ]);
}
