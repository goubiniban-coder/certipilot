/**
 * CSV for French spreadsheets: semicolon separator, CRLF line ends and a
 * UTF-8 BOM so that Excel shows accents correctly.
 */
export type CsvValue = string | number | boolean | null | undefined;

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "boolean" ? (value ? "oui" : "non") : String(value);
  // Neutralise formulas (CSV injection) typed into free-text fields.
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(columns: readonly { header: string; value: (row: T) => CsvValue }[], rows: readonly T[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(";")];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
