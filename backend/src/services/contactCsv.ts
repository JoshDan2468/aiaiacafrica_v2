import type { ManualContactInput } from "../types/contact";

export class ContactCsvError extends Error {}

export interface ContactCsvRow {
  row: number;
  value: ManualContactInput | null;
  reason?: string;
}

const MAX_CSV_BYTES = 75 * 1024;
const MAX_DATA_ROWS = 500;
const allowedHeaders = new Set([
  "name",
  "category",
  "email",
  "organization",
  "country",
  "consent",
  "consent_evidence",
  "source",
]);

export function parseCsvRecords(csv: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  const endField = () => {
    record.push(field);
    field = "";
    closedQuote = false;
  };
  const endRecord = () => {
    endField();
    if (record.some((value) => value.trim() !== "")) records.push(record);
    record = [];
    if (records.length > MAX_DATA_ROWS + 1) {
      throw new ContactCsvError(
        `CSV may contain at most ${MAX_DATA_ROWS} contacts`,
      );
    }
  };

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]!;
    if (quoted) {
      if (character === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field || closedQuote)
        throw new ContactCsvError("Malformed quoted CSV field");
      quoted = true;
    } else if (character === ",") {
      endField();
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      endRecord();
    } else if (closedQuote) {
      if (character !== " " && character !== "\t") {
        throw new ContactCsvError("Unexpected text after quoted CSV field");
      }
    } else {
      field += character;
    }
  }
  if (quoted) throw new ContactCsvError("Unclosed quoted CSV field");
  if (field || record.length || closedQuote) endRecord();
  return records;
}

export function parseContactCsv(csv: string): ContactCsvRow[] {
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
    throw new ContactCsvError("CSV must be 75 KiB or smaller");
  }
  if (csv.includes("\u0000"))
    throw new ContactCsvError("CSV contains a null byte");
  const records = parseCsvRecords(csv.replace(/^\uFEFF/, ""));
  if (!records.length) throw new ContactCsvError("CSV is empty");
  const headers = records[0]!.map((header) => {
    const normalized = header.trim().toLowerCase();
    return normalized === "company" || normalized === "organisation"
      ? "organization"
      : normalized;
  });
  if (
    !headers.includes("name") ||
    !headers.includes("email") ||
    headers.some((header) => !allowedHeaders.has(header)) ||
    new Set(headers).size !== headers.length
  ) {
    throw new ContactCsvError(
      "CSV header must include name and email, with optional organization and country",
    );
  }

  return records.slice(1).map((cells, index) => {
    if (cells.length !== headers.length) {
      return {
        row: index + 2,
        value: null,
        reason: "Incorrect number of columns",
      };
    }
    const values = Object.fromEntries(
      headers.map((header, column) => [header, cells[column]!.trim()]),
    );
    return {
      row: index + 2,
      value: {
        ...(values["category"]
          ? { category: values["category"] as ManualContactInput["category"] }
          : {}),
        name: values["name"] ?? "",
        email: values["email"] ?? "",
        organization: values["organization"] || undefined,
        country: values["country"] || undefined,
        consent: (values["consent"] || "UNKNOWN") as NonNullable<
          ManualContactInput["consent"]
        >,
        consentEvidence: values["consent_evidence"] || undefined,
        sourceLabel: values["source"] || undefined,
      },
    };
  });
}
