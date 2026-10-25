import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/export/csv";

describe("toCsv", () => {
  const columns = [
    { header: "Nom", value: (r: { name: string; score: number | null; ok: boolean }) => r.name },
    { header: "Score", value: (r: { score: number | null }) => r.score },
    { header: "Réussi", value: (r: { ok: boolean }) => r.ok },
  ];

  it("writes a BOM, semicolons, CRLF and French booleans", () => {
    expect(toCsv(columns, [{ name: "Émile", score: 95.5, ok: true }, { name: "Zoé", score: null, ok: false }])).toBe(
      "﻿Nom;Score;Réussi\r\nÉmile;95.5;oui\r\nZoé;;non\r\n",
    );
  });

  it("quotes separators, quotes and line breaks", () => {
    expect(toCsv(columns, [{ name: 'Dupont; "Jo"\nfils', score: 1, ok: true }])).toContain('"Dupont; ""Jo""\nfils";1;oui');
  });

  it("neutralises spreadsheet formulas in text", () => {
    expect(toCsv(columns, [{ name: "=HYPERLINK(1)", score: -3, ok: true }])).toContain("'=HYPERLINK(1);-3;oui");
  });
});
