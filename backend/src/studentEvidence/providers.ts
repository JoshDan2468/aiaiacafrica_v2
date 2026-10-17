import { LocalStudentEvidenceStorage, PrivateStudentEvidenceStorage } from "./local.storage";
import { ClamdStudentEvidenceScanner } from "./clamd.scanner";
import { UnavailableMalwareScanner, type MalwareScanner } from "./malwareScanner";
import { assertStudentEvidenceProductionReady } from "./productionReadiness";
import type { StudentEvidenceStorage } from "./storage";

export interface StudentEvidenceProviders {
  readonly storage: StudentEvidenceStorage;
  readonly scanner: MalwareScanner;
}

/** Verify real VPS dependencies before opening the HTTP listener. */
export async function prepareProductionStudentEvidenceProviders(
  storageDirectory: string,
  clamdSocket: string,
): Promise<StudentEvidenceProviders> {
  const storage = new PrivateStudentEvidenceStorage(storageDirectory);
  const scanner = new ClamdStudentEvidenceScanner(clamdSocket);
  await storage.checkReady();
  await scanner.checkReady();
  return createStudentEvidenceProviders(
    { production: true, localStorageDirectory: storageDirectory },
    { storage, scanner },
  );
}

/** Production adapters must be explicitly constructed by the server composition root. */
export function createStudentEvidenceProviders(
  configuration: {
    readonly production: boolean;
    readonly localStorageDirectory: string;
  },
  configuredProviders?: StudentEvidenceProviders,
): StudentEvidenceProviders {
  if (configuration.production && !configuredProviders) {
    throw new Error("Production Student evidence providers must be explicitly configured");
  }

  const providers: StudentEvidenceProviders = configuredProviders ?? {
    storage: new LocalStudentEvidenceStorage(configuration.localStorageDirectory),
    scanner: new UnavailableMalwareScanner(),
  };
  const { storage, scanner } = providers;
  if (
    !storage ||
    typeof storage.store !== "function" ||
    typeof storage.retrieve !== "function" ||
    typeof storage.delete !== "function" ||
    !scanner ||
    typeof scanner.scan !== "function"
  ) {
    throw new Error("Invalid Student evidence provider interfaces");
  }
  assertStudentEvidenceProductionReady(configuration.production, storage, scanner);
  if (
    configuration.production &&
    (storage.productionReady !== true || scanner.productionReady !== true)
  ) {
    // Reject malformed runtime adapters, including truthy strings instead of reviewed markers.
    throw new Error("Student evidence production storage and malware scanner are not configured");
  }

  return { storage, scanner };
}
