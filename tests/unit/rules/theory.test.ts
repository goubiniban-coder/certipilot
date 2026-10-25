import { describe, expect, it } from "vitest";
import { evaluateTheory, theoryPercent } from "@/lib/rules/theory";

const standard = { passPercent: 70, requiresIpr: false };
const r482 = { passPercent: 70, requiresIpr: true };

describe("evaluateTheory", () => {
  it("réussit avec un QCM au-dessus du seuil", () => {
    expect(evaluateTheory([{ kind: "qcm", score: 28, maxScore: 40 }], standard)).toEqual({
      passed: true,
      reasons: [],
    });
  });

  it("échoue sous le seuil", () => {
    const outcome = evaluateTheory([{ kind: "qcm", score: 27, maxScore: 40 }], standard);
    expect(outcome.passed).toBe(false);
    expect(outcome.reasons).toEqual(["QCM théorique échoué : 27/40 (minimum 70 %)"]);
  });

  it("exige le QCM-IPR quand la recommandation le prévoit", () => {
    const outcome = evaluateTheory([{ kind: "qcm", score: 40, maxScore: 40 }], r482);
    expect(outcome.passed).toBe(false);
    expect(outcome.reasons).toEqual(["QCM-IPR non passé"]);
    expect(
      evaluateTheory(
        [
          { kind: "qcm", score: 40, maxScore: 40 },
          { kind: "qcm_ipr", score: 20, maxScore: 20 },
        ],
        r482,
      ).passed,
    ).toBe(true);
  });

  it("signale un QCM manquant", () => {
    expect(evaluateTheory([], standard).reasons).toEqual(["QCM théorique non passé"]);
  });

  it("refuse les scores impossibles", () => {
    expect(() => theoryPercent({ kind: "qcm", score: 1, maxScore: 0 })).toThrow(
      "supérieur à 0",
    );
    expect(() => theoryPercent({ kind: "qcm", score: 41, maxScore: 40 })).toThrow(
      "Score théorique invalide",
    );
    expect(() => theoryPercent({ kind: "qcm", score: -1, maxScore: 40 })).toThrow(
      "Score théorique invalide",
    );
  });
});
