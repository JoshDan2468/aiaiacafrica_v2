import { withTransaction } from "../config/database";
import type { DatabaseExecutor } from "../types/database";
import { randomUUID } from "node:crypto";
import type { AdminAuditRepository } from "../repositories/adminAudit.repository";
import { createPublicError } from "../middleware/error.middleware";
import type { ContactRepository } from "../repositories/contact.repository";
import type {
  ContactFilters,
  ContactImportSummary,
  ManualContactInput,
} from "../types/contact";
import { manualContactSchema } from "../validators/contact.validator";
import { ContactCsvError, parseContactCsv } from "./contactCsv";

export class ContactService {
  constructor(
    private readonly repository: ContactRepository,
    private readonly audits?: AdminAuditRepository,
  ) {}

  async list(filters: ContactFilters) {
    const result = await this.repository.list(filters);
    return { ...result, page: filters.page, limit: filters.limit };
  }

  async add(input: ManualContactInput, adminId: string) {
    const normalized = manualContactSchema.parse(input);
    if (
      (await this.repository.existingEmails([normalized.email])).has(
        normalized.email,
      )
    ) {
      throw createPublicError(409, "A contact with this email already exists");
    }
    const write = async (executor?: DatabaseExecutor) => {
      const contact = await this.repository.insertManual(
        normalized,
        "MANUAL",
        adminId,
        executor,
      );
      if (!contact)
        throw createPublicError(
          409,
          "A contact with this email already exists",
        );
      await this.audits?.create(
        {
          adminId,
          action: "CONTACT_IMPORTED",
          entityType: "COMMUNICATION_CONTACT",
          entityId: contact.id.replace("manual:", ""),
          metadata: { source: "MANUAL" },
        },
        executor,
      );
      return contact;
    };
    return this.audits ? withTransaction(write) : write();
  }

  async importCsv(csv: string, adminId: string): Promise<ContactImportSummary> {
    let rows;
    try {
      rows = parseContactCsv(csv);
    } catch (error) {
      if (error instanceof ContactCsvError)
        throw createPublicError(400, error.message);
      throw error;
    }
    const summary: ContactImportSummary = {
      imported: 0,
      skipped: 0,
      invalid: 0,
      errors: [],
    };
    const valid: ManualContactInput[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.value) {
        summary.invalid += 1;
        if (summary.errors.length < 20) {
          summary.errors.push({
            row: row.row,
            reason: row.reason ?? "Malformed row",
          });
        }
        continue;
      }
      const parsed = manualContactSchema.safeParse(row.value);
      if (!parsed.success) {
        summary.invalid += 1;
        if (summary.errors.length < 20) {
          const field = parsed.error.issues[0]?.path[0];
          summary.errors.push({
            row: row.row,
            reason: field ? `Invalid ${String(field)}` : "Invalid contact",
          });
        }
        continue;
      }
      if (seen.has(parsed.data.email)) {
        summary.skipped += 1;
        continue;
      }
      seen.add(parsed.data.email);
      valid.push(parsed.data);
    }
    if (!valid.length) return summary;

    const existing = await this.repository.existingEmails(
      valid.map((contact) => contact.email),
    );
    const candidates = valid.filter((contact) => !existing.has(contact.email));
    summary.skipped += valid.length - candidates.length;
    const write = async (executor?: DatabaseExecutor) => {
      const inserted = await this.repository.insertImported(
        candidates,
        adminId,
        executor,
      );
      summary.imported = inserted.size;
      summary.skipped += candidates.length - inserted.size;
      await this.audits?.create(
        {
          adminId,
          action: "CONTACT_IMPORTED",
          entityType: "COMMUNICATION_CONTACT",
          entityId: randomUUID(),
          metadata: {
            source: "IMPORT",
            imported: String(summary.imported),
            invalid: String(summary.invalid),
            skipped: String(summary.skipped),
          },
        },
        executor,
      );
      return summary;
    };
    return this.audits ? withTransaction(write) : write();
  }
}
