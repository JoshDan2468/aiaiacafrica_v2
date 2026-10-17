import { randomBytes, randomUUID } from "node:crypto";
import { getDatabasePool, withTransaction } from "../config/database";
import type { DatabaseExecutor, TransactionRunner } from "../types/database";
import type { CommercialApplicationKind } from "../types/commercialApplication";
import { createPublicError } from "../middleware/error.middleware";
import type {
  CommercialImportSummary,
  parseCommercialImport,
} from "../services/commercialImport";

export class CommercialImportRepository {
  constructor(
    private readonly executor?: DatabaseExecutor,
    private readonly transaction: TransactionRunner = withTransaction,
  ) {}
  async process(
    kind: CommercialApplicationKind,
    input: { source: string; approvalEvidence: string },
    candidates: ReturnType<typeof parseCommercialImport>["candidates"],
    summary: CommercialImportSummary,
    adminId: string | null,
  ) {
    const prefix = kind === "SPONSOR" ? "sponsor" : "exhibitor";
    const packages =
      kind === "SPONSOR" ? "sponsorship_packages" : "exhibition_packages";
    const database = this.executor ?? getDatabasePool();
    if (!database) throw new Error("Database is not configured");
    const work = async (db: DatabaseExecutor) => {
      for (const candidate of candidates) {
        const row = candidate.value;
        if (adminId)
          await db.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
            [`${kind}:${row.contactEmail}`],
          );
        const existing = await db.query(
          `SELECT id FROM ${prefix}_applications WHERE event_year=2027 AND lower(btrim(contact_email))=$1 LIMIT 1`,
          [row.contactEmail],
        );
        if (existing.rows.length) {
          summary.skipped++;
          continue;
        }
        const selected = (
          await db.query<{
            id: string;
            code: string;
            name: string;
            currency: string;
            price_minor: string;
          }>(
            `SELECT id,code,name,currency,price_minor FROM ${packages} WHERE event_year=2027 AND is_active=true AND code=$1${adminId ? " FOR SHARE" : ""}`,
            [row.packageCode],
          )
        ).rows[0];
        if (!selected) {
          summary.invalid++;
          summary.errors.push({
            row: candidate.row,
            reason: "Package is unavailable",
          });
          continue;
        }
        summary.valid++;
        summary.rows.push({
          row: candidate.row,
          organizationName: row.organizationName,
          contactEmail: row.contactEmail,
          packageCode: row.packageCode,
        });
        if (!adminId) continue;
        const id = randomUUID(),
          now = new Date();
        const reference = `AIAIAC-${kind === "SPONSOR" ? "SPN" : "EXH"}-${randomBytes(4).toString("hex").toUpperCase()}`;
        const inserted = await db.query(
          `INSERT INTO ${prefix}_applications(id,reference,event_year,package_id,package_code_snapshot,package_name_snapshot,currency_snapshot,price_minor_snapshot,organization_name,country,website,industry,contact_first_name,contact_last_name,contact_email,contact_phone,contact_job_title,applicant_notes,consent,status,reviewed_at,reviewed_by_admin_id,created_at,updated_at,origin,import_source,approval_evidence) VALUES($1,$2,2027,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,false,'CONFIRMED',$18,$19,$18,$18,'MANUAL_IMPORT',$20,$21) ON CONFLICT(event_year,package_id,contact_email) DO NOTHING RETURNING id`,
          [
            id,
            reference,
            selected.id,
            selected.code,
            selected.name,
            selected.currency,
            selected.price_minor,
            row.organizationName,
            row.country,
            row.website ?? null,
            row.industry ?? null,
            row.contactFirstName,
            row.contactLastName,
            row.contactEmail,
            row.contactPhone,
            row.contactJobTitle ?? null,
            row.notes ?? null,
            now,
            adminId,
            input.source,
            input.approvalEvidence,
          ],
        );
        if (!inserted.rows.length) {
          summary.skipped++;
          summary.valid--;
          summary.rows.pop();
          continue;
        }
        await db.query(
          `INSERT INTO ${prefix}_application_history(id,application_id,action,from_status,to_status,admin_id,internal_note,created_at) VALUES($1,$2,'CONFIRMED',NULL,'CONFIRMED',$3,$4,$5)`,
          [
            randomUUID(),
            id,
            adminId,
            `Manual approval import. Source: ${input.source}. Evidence: ${input.approvalEvidence.slice(0, 700)}`,
            now,
          ],
        );
        await db.query(
          `INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,'COMMERCIAL_APPLICATION_IMPORTED','COMMERCIAL_APPLICATION',$3,$4::jsonb,$5)`,
          [
            randomUUID(),
            adminId,
            id,
            JSON.stringify({
              kind,
              origin: "MANUAL_IMPORT",
              source: input.source,
              reference,
            }),
            now,
          ],
        );
        summary.imported++;
      }
      if (adminId && summary.invalid)
        throw createPublicError(
          409,
          "A package became unavailable; refresh the import preview. Nothing was imported",
        );
      return summary;
    };
    return adminId ? this.transaction(work) : work(database);
  }
}
