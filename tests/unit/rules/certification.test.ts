import { describe, expect, it } from "vitest";
import { formatCertificateNumber, obtainedCategories } from "@/lib/rules/certification";

describe("obtainedCategories", () => {
  const attempts = [
    { categoryId: "c1", practicalStatus: "passed" as const },
    { categoryId: "c3", practicalStatus: "failed" as const },
    { categoryId: "c5", practicalStatus: "incomplete" as const },
    { categoryId: "c1", practicalStatus: "passed" as const },
  ];

  it("ne garde que les catégories dont la pratique est réussie", () => {
    expect(obtainedCategories(true, attempts)).toEqual(["c1"]);
  });

  it("ne délivre rien si la théorie est échouée", () => {
    expect(obtainedCategories(false, attempts)).toEqual([]);
  });
});

describe("formatCertificateNumber", () => {
  it("formate PREFIXE-ANNEE-SEQUENCE", () => {
    expect(formatCertificateNumber(" otc1 ", 2026, 42)).toBe("OTC1-2026-000042");
  });

  it("refuse les valeurs invalides", () => {
    expect(() => formatCertificateNumber("A", 2026, 1)).toThrow("préfixe");
    expect(() => formatCertificateNumber("OTC-1", 2026, 1)).toThrow("préfixe");
    expect(() => formatCertificateNumber("OTC", 2019, 1)).toThrow("Année invalide");
    expect(() => formatCertificateNumber("OTC", 2026.5, 1)).toThrow("Année invalide");
    expect(() => formatCertificateNumber("OTC", 2026, 0)).toThrow("séquence");
    expect(() => formatCertificateNumber("OTC", 2026, 1.5)).toThrow("séquence");
  });
});
