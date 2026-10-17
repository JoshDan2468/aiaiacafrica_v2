import type { ReportColumn, ReportRow } from "../types/report";

export function csvCell(value: string | null | undefined): string {
  let safe = (value ?? "").replaceAll("\u0000", "");
  if (/^[\t\r\n]|^[\s\u0000-\u001f]*[=+\-@]/u.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function csvHeader(columns: readonly ReportColumn[]): string {
  return `${columns.map((column) => csvCell(column.label)).join(",")}\r\n`;
}

export function csvRow(
  columns: readonly ReportColumn[],
  row: ReportRow,
): string {
  return `${columns.map((column) => csvCell(row[column.key])).join(",")}\r\n`;
}
