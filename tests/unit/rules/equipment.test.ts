import { describe, expect, it } from "vitest";
import { checkEquipment, inspectionDueDate } from "@/lib/rules/equipment";

const forklift = {
  name: "Chariot frontal",
  serialNumber: "SN-001",
  categoryId: "r489-3",
  lastInspectionOn: "2025-11-03",
};

const codes = (e: typeof forklift | { [k: string]: unknown }, date: string, category = "r489-3") =>
  checkEquipment(e as typeof forklift, category, "R.489 cat. 3", date).map((v) => v.code);

describe("checkEquipment", () => {
  it("accepte une vérification de moins d'un an", () => {
    expect(codes(forklift, "2026-11-02")).toEqual([]);
    expect(codes(forklift, "2025-11-03")).toEqual([]);
  });

  it("bloque à partir d'un an jour pour jour", () => {
    expect(inspectionDueDate("2025-11-03")).toBe("2026-11-03");
    const violations = checkEquipment(forklift, "r489-3", "R.489 cat. 3", "2026-11-03");
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("EQUIPMENT_INSPECTION_EXPIRED");
    expect(violations[0]?.message).toContain("plus d'un an");
  });

  it("bloque sans vérification enregistrée", () => {
    expect(codes({ ...forklift, lastInspectionOn: null }, "2026-01-01")).toEqual([
      "EQUIPMENT_NO_INSPECTION",
    ]);
  });

  it("bloque une vérification datée après le test", () => {
    expect(codes(forklift, "2025-11-02")).toEqual(["EQUIPMENT_INSPECTION_IN_FUTURE"]);
  });

  it("bloque un engin d'une autre catégorie", () => {
    expect(codes(forklift, "2026-01-01", "r489-5")).toEqual(["EQUIPMENT_WRONG_CATEGORY"]);
  });
});
