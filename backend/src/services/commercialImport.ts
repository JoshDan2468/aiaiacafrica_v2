import { z } from "zod";
import { parseCsvRecords, ContactCsvError } from "./contactCsv";
import {
  sponsorApplicationSchema,
  exhibitorApplicationSchema,
} from "../validators/commercialApplication.validator";
import type { CommercialApplicationKind } from "../types/commercialApplication";

export const commercialImportRequestSchema = z.strictObject({
  csv: z
    .string()
    .min(1)
    .max(75 * 1024),
  source: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[^\u0000-\u001f\u007f]+$/),
  approvalEvidence: z
    .string()
    .trim()
    .min(10)
    .max(1000)
    .regex(/^[^\u0000-\u001f\u007f]+$/),
  acknowledged: z.literal(true).optional(),
});
const sponsor = sponsorApplicationSchema
  .omit({ consent: true, sponsorshipTier: true })
  .extend({ packageCode: sponsorApplicationSchema.shape.sponsorshipTier });
const exhibitor = exhibitorApplicationSchema
  .omit({ consent: true, exhibitionOption: true })
  .extend({ packageCode: exhibitorApplicationSchema.shape.exhibitionOption });
export type CommercialImportRow =
  z.infer<typeof sponsor> | z.infer<typeof exhibitor>;
export interface CommercialImportSummary {
  valid: number;
  imported: number;
  skipped: number;
  invalid: number;
  errors: { row: number; reason: string }[];
  rows: {
    row: number;
    organizationName: string;
    contactEmail: string;
    packageCode: string;
  }[];
}
export function parseCommercialImport(
  csv: string,
  kind: CommercialApplicationKind,
) {
  if (Buffer.byteLength(csv, "utf8") > 75 * 1024 || csv.includes("\u0000"))
    throw new ContactCsvError(
      "CSV must be 75 KiB or smaller and contain no null bytes",
    );
  const records = parseCsvRecords(csv.replace(/^\uFEFF/, ""));
  if (records.length < 2 || records.length > 51)
    throw new ContactCsvError(
      "CSV must contain between 1 and 50 organizations",
    );
  const headers = records[0]!.map((value) => value.trim());
  const schema = kind === "SPONSOR" ? sponsor : exhibitor;
  const required = [
    "organizationName",
    "country",
    "contactFirstName",
    "contactLastName",
    "contactEmail",
    "contactPhone",
    "packageCode",
  ];
  if (
    new Set(headers).size !== headers.length ||
    required.some((key) => !headers.includes(key)) ||
    headers.some((key) => !(key in schema.shape))
  )
    throw new ContactCsvError(
      "CSV headers do not match the approved organization import format",
    );
  const summary: CommercialImportSummary = {
    valid: 0,
    imported: 0,
    skipped: 0,
    invalid: 0,
    errors: [],
    rows: [],
  };
  const candidates: { row: number; value: CommercialImportRow }[] = [];
  const seen = new Set<string>();
  records.slice(1).forEach((cells, index) => {
    const row = index + 2;
    const parsed =
      cells.length === headers.length
        ? schema.safeParse(
            Object.fromEntries(
              headers.map((key, column) => [key, cells[column]!.trim()]),
            ),
          )
        : null;
    if (!parsed?.success) {
      summary.invalid++;
      summary.errors.push({
        row,
        reason: parsed
          ? `Invalid ${String(parsed.error.issues[0]?.path[0] ?? "organization")}`
          : "Incorrect number of columns",
      });
      return;
    }
    if (seen.has(parsed.data.contactEmail)) {
      summary.skipped++;
      return;
    }
    seen.add(parsed.data.contactEmail);
    candidates.push({ row, value: parsed.data });
  });
  return { summary, candidates };
}
