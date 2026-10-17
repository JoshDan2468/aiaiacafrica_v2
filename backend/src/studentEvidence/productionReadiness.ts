import type { MalwareScanner } from "./malwareScanner";
import type { StudentEvidenceStorage } from "./storage";

export function assertStudentEvidenceProductionReady(
  production: boolean,
  storage: StudentEvidenceStorage,
  scanner: MalwareScanner,
): void {
  if (production && (!storage.productionReady || !scanner.productionReady)) {
    throw new Error(
      "Student evidence production storage and malware scanner are not configured",
    );
  }
}
