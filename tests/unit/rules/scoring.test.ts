import { describe, expect, it } from "vitest";
import {
  evaluatePractical,
  gridMaxPoints,
  PRACTICAL_PASS_SCORE,
  roundOneDecimal,
  type GridItem,
} from "@/lib/rules/scoring";

const grid: GridItem[] = [
  { id: "a", label: "Vérifications avant utilisation", maxPoints: 20, eliminatory: false },
  { id: "b", label: "Circulation à vide", maxPoints: 30, eliminatory: false },
  { id: "c", label: "Prise et dépose de charge", maxPoints: 50, eliminatory: false },
  { id: "d", label: "Respect des règles de sécurité", maxPoints: 0, eliminatory: true },
];

describe("evaluatePractical", () => {
  it("réussit à partir de 70/100", () => {
    const outcome = evaluatePractical(grid, [
      { gridItemId: "a", points: 15 },
      { gridItemId: "b", points: 20 },
      { gridItemId: "c", points: 35 },
      { gridItemId: "d", points: 0 },
    ]);
    expect(outcome.status).toBe("passed");
    expect(outcome.score).toBe(70);
    expect(outcome.reasons[0]).toContain("minimum requis 70/100");
  });

  it("échoue en dessous de 70/100", () => {
    const outcome = evaluatePractical(grid, [
      { gridItemId: "a", points: 15 },
      { gridItemId: "b", points: 20 },
      { gridItemId: "c", points: 34.5 },
      { gridItemId: "d", points: 0 },
    ]);
    expect(outcome.status).toBe("failed");
    expect(outcome.score).toBe(69.5);
    expect(outcome.reasons[0]).toContain("inférieur au minimum");
  });

  it("échoue sur un critère éliminatoire même avec 100/100", () => {
    const outcome = evaluatePractical(grid, [
      { gridItemId: "a", points: 20 },
      { gridItemId: "b", points: 30 },
      { gridItemId: "c", points: 50 },
      { gridItemId: "d", points: 0, eliminatoryFault: true },
    ]);
    expect(outcome.status).toBe("failed");
    expect(outcome.score).toBe(100);
    expect(outcome.eliminatoryFaults).toEqual(["d"]);
    expect(outcome.reasons).toEqual([
      "Critère éliminatoire non satisfait : « Respect des règles de sécurité »",
    ]);
  });

  it("échoue dès la faute éliminatoire, même si la grille n'est pas finie", () => {
    const outcome = evaluatePractical(grid, [
      { gridItemId: "d", points: 0, eliminatoryFault: true },
    ]);
    expect(outcome.status).toBe("failed");
    expect(outcome.missingItemIds).toEqual(["a", "b", "c"]);
  });

  it("reste incomplet tant que des critères manquent", () => {
    const outcome = evaluatePractical(grid, [{ gridItemId: "a", points: 20 }]);
    expect(outcome.status).toBe("incomplete");
    expect(outcome.score).toBe(20);
    expect(outcome.reasons).toEqual(["3 critère(s) restant(s) à noter"]);
  });

  it("ramène une grille quelconque sur 100 points", () => {
    const small: GridItem[] = [
      { id: "x", label: "X", maxPoints: 3, eliminatory: false },
      { id: "y", label: "Y", maxPoints: 3, eliminatory: false },
    ];
    const outcome = evaluatePractical(small, [
      { gridItemId: "x", points: 3 },
      { gridItemId: "y", points: 2 },
    ]);
    expect(outcome.maxPoints).toBe(6);
    expect(outcome.score).toBe(83.3);
  });

  it("accepte un seuil paramétré", () => {
    const outcome = evaluatePractical(
      grid,
      [
        { gridItemId: "a", points: 20 },
        { gridItemId: "b", points: 30 },
        { gridItemId: "c", points: 25 },
        { gridItemId: "d", points: 0 },
      ],
      80,
    );
    expect(outcome.status).toBe("failed");
  });

  it("refuse les notes impossibles", () => {
    expect(() => evaluatePractical([], [])).toThrow("aucun critère");
    expect(() =>
      evaluatePractical([{ id: "z", label: "Z", maxPoints: 0, eliminatory: true }], []),
    ).toThrow("plus de 0 point");
    expect(() => evaluatePractical(grid, [{ gridItemId: "?", points: 1 }])).toThrow(
      "Critère inconnu",
    );
    expect(() =>
      evaluatePractical(grid, [
        { gridItemId: "a", points: 1 },
        { gridItemId: "a", points: 2 },
      ]),
    ).toThrow("noté deux fois");
    expect(() => evaluatePractical(grid, [{ gridItemId: "a", points: 21 }])).toThrow(
      "entre 0 et 20",
    );
    expect(() => evaluatePractical(grid, [{ gridItemId: "a", points: -1 }])).toThrow(
      "Note invalide",
    );
    expect(() => evaluatePractical(grid, [{ gridItemId: "a", points: Number.NaN }])).toThrow(
      "Note invalide",
    );
    expect(() =>
      evaluatePractical(grid, [{ gridItemId: "a", points: 1, eliminatoryFault: true }]),
    ).toThrow("n'est pas un critère éliminatoire");
  });
});

describe("helpers", () => {
  it("expose le seuil par défaut et les calculs", () => {
    expect(PRACTICAL_PASS_SCORE).toBe(70);
    expect(gridMaxPoints(grid)).toBe(100);
    expect(roundOneDecimal(69.96)).toBe(70);
  });
});
