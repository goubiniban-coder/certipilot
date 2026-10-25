import { isIsoDate } from "@/lib/rules/dates";

/**
 * Candidate import from a CSV exported by a spreadsheet. Accepts ";" or ","
 * separators, quoted values, French (JJ/MM/AAAA) or ISO dates, and French
 * column names, in any order.
 */
export interface CandidateCsvRow {
  line: number;
  lastName: string;
  firstName: string;
  birthDate: string;
  company: string | null;
  email: string | null;
  trainerName: string | null;
}

export interface CsvError {
  line: number;
  message: string;
}

export interface CsvParseResult {
  rows: CandidateCsvRow[];
  errors: CsvError[];
}

const COLUMNS = {
  lastName: ["nom", "nom de famille", "last_name"],
  firstName: ["prenom", "prénom", "first_name"],
  birthDate: ["date de naissance", "date_naissance", "naissance", "birth_date"],
  company: ["entreprise", "societe", "société", "client", "entreprise cliente"],
  email: ["email", "e-mail", "courriel"],
  trainerName: ["formateur", "trainer"],
} as const;

type Column = keyof typeof COLUMNS;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Splits one CSV line, honouring double quotes. */
export function splitCsvLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

/** "21/07/2000", "21-07-2000" or "2000-07-21" → "2000-07-21"; null if invalid. */
export function parseFrenchDate(value: string): string | null {
  const trimmed = value.trim();
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  const iso = fr ? `${fr[3]}-${fr[2]!.padStart(2, "0")}-${fr[1]!.padStart(2, "0")}` : trimmed;
  return isIsoDate(iso) ? iso : null;
}

export function parseCandidatesCsv(text: string): CsvParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => l.trim() !== "");
  if (headerIndex === -1) return { rows: [], errors: [{ line: 1, message: "Le fichier est vide." }] };

  const headerLine = lines[headerIndex]!;
  const separator = headerLine.split(";").length >= headerLine.split(",").length ? ";" : ",";
  const headers = splitCsvLine(headerLine, separator).map(normalizeHeader);

  const index = {} as Record<Column, number>;
  for (const column of Object.keys(COLUMNS) as Column[]) {
    index[column] = headers.findIndex((h) => (COLUMNS[column] as readonly string[]).includes(h));
  }
  const missing = (["lastName", "firstName", "birthDate"] as const).filter((c) => index[c] === -1);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: headerIndex + 1,
          message: "Colonnes obligatoires manquantes : nom, prénom et date de naissance.",
        },
      ],
    };
  }

  const rows: CandidateCsvRow[] = [];
  const errors: CsvError[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim() === "") continue;
    const cells = splitCsvLine(raw, separator);
    const get = (column: Column) => (index[column] >= 0 ? (cells[index[column]] ?? "").trim() : "");
    const line = i + 1;

    const lastName = get("lastName");
    const firstName = get("firstName");
    const birthDate = parseFrenchDate(get("birthDate"));
    if (!lastName || !firstName) {
      errors.push({ line, message: `Ligne ${line} : nom et prénom obligatoires.` });
      continue;
    }
    if (!birthDate) {
      errors.push({ line, message: `Ligne ${line} : date de naissance invalide (« ${get("birthDate")} »).` });
      continue;
    }
    rows.push({
      line,
      lastName,
      firstName,
      birthDate,
      company: get("company") || null,
      email: get("email") || null,
      trainerName: get("trainerName") || null,
    });
  }
  return { rows, errors };
}
