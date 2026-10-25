import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  daysBetween,
  isIsoDate,
  toIsoDate,
} from "@/lib/rules/dates";

describe("dates", () => {
  it("valide le format AAAA-MM-JJ", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("28/02/2026")).toBe(false);
    expect(() => addDays("2026-13-01", 1)).toThrow("Date invalide");
  });

  it("ajoute des années en gérant le 29 février", () => {
    expect(addYears("2026-03-15", 5)).toBe("2031-03-15");
    expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
    expect(addYears("2024-02-29", 4)).toBe("2028-02-29");
  });

  it("ajoute des mois en restant dans le mois cible", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-10-25", 6)).toBe("2027-04-25");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
  });

  it("ajoute des jours et calcule les écarts", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-01-01", "2026-03-02")).toBe(60);
    expect(daysBetween("2026-03-02", "2026-01-01")).toBe(-60);
  });

  it("compare deux dates", () => {
    expect(compareDates("2026-01-01", "2026-01-02")).toBe(-1);
    expect(compareDates("2026-01-02", "2026-01-02")).toBe(0);
    expect(compareDates("2026-01-03", "2026-01-02")).toBe(1);
  });

  it("donne la date du jour à Paris", () => {
    expect(toIsoDate(new Date("2026-10-25T22:30:00Z"))).toBe("2026-10-25");
    expect(toIsoDate(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
    expect(toIsoDate(new Date("2026-10-25T23:30:00Z"), "UTC")).toBe("2026-10-25");
  });
});
