import type { MigrationBuilder } from "node-pg-migrate";

const constraint = "student_verification_history_note_required";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("student_verification_history", constraint);
  pgm.addConstraint("student_verification_history", constraint, {
    check:
      "action NOT IN ('MORE_INFORMATION_REQUIRED', 'REJECTED') OR " +
      "(note IS NOT NULL AND char_length(btrim(note)) BETWEEN 10 AND 1000)",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("student_verification_history", constraint);
  pgm.addConstraint("student_verification_history", constraint, {
    check:
      "action NOT IN ('MORE_INFORMATION_REQUIRED', 'REJECTED') OR " +
      "char_length(btrim(note)) BETWEEN 10 AND 1000",
  });
}
