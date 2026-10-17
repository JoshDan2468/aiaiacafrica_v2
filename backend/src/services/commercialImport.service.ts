import type { DatabaseExecutor, TransactionRunner } from "../types/database";
import type { CommercialApplicationKind } from "../types/commercialApplication";
import { createPublicError } from "../middleware/error.middleware";
import { ContactCsvError } from "./contactCsv";
import {
  commercialImportRequestSchema,
  parseCommercialImport,
} from "./commercialImport";
import { CommercialImportRepository } from "../repositories/commercialImport.repository";

export class CommercialImportService {
  private readonly repository: CommercialImportRepository;
  constructor(executor?: DatabaseExecutor, transaction?: TransactionRunner) {
    this.repository = new CommercialImportRepository(executor, transaction);
  }
  async process(
    kind: CommercialApplicationKind,
    body: unknown,
    adminId: string | null,
  ) {
    const input = commercialImportRequestSchema.safeParse(body);
    if (!input.success || (adminId && !input.data.acknowledged))
      throw createPublicError(
        400,
        "Import requires valid CSV, source, approval evidence and final acknowledgment",
      );
    let parsed;
    try {
      parsed = parseCommercialImport(input.data.csv, kind);
    } catch (error) {
      if (error instanceof ContactCsvError)
        throw createPublicError(400, error.message);
      throw error;
    }
    const { summary, candidates } = parsed;
    if (adminId && summary.invalid)
      throw createPublicError(400, "Correct invalid CSV rows before importing");
    return this.repository.process(
      kind,
      input.data,
      candidates,
      summary,
      adminId,
    );
  }
}
