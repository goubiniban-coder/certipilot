import { PRACTICAL_MAX_SCORE } from "@/lib/constants";

/** Default pass mark for the practical test, out of 100. */
export const PRACTICAL_PASS_SCORE = 70;

export interface GridItem {
  id: string;
  label: string;
  maxPoints: number;
  eliminatory: boolean;
}

export interface CriterionMark {
  gridItemId: string;
  points: number;
  /** Only meaningful on eliminatory items: the candidate made a disqualifying fault. */
  eliminatoryFault?: boolean;
}

export type PracticalStatus = "incomplete" | "passed" | "failed";

export interface PracticalOutcome {
  status: PracticalStatus;
  /** Raw points obtained. */
  points: number;
  /** Maximum raw points of the grid. */
  maxPoints: number;
  /** Score brought back to 100, rounded to one decimal. */
  score: number;
  /** Items not marked yet. */
  missingItemIds: string[];
  /** Eliminatory items on which a fault was recorded. */
  eliminatoryFaults: string[];
  /** French explanation of the result. */
  reasons: string[];
}

export function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function gridMaxPoints(items: readonly GridItem[]): number {
  return items.reduce((sum, item) => sum + item.maxPoints, 0);
}

/** Checks the marks against the grid and throws on impossible values. */
export function validateMarks(
  items: readonly GridItem[],
  marks: readonly CriterionMark[],
): void {
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  for (const mark of marks) {
    const item = byId.get(mark.gridItemId);
    if (!item) {
      throw new RangeError(`Critère inconnu dans la grille : ${mark.gridItemId}`);
    }
    if (seen.has(mark.gridItemId)) {
      throw new RangeError(`Critère noté deux fois : « ${item.label} »`);
    }
    seen.add(mark.gridItemId);
    if (!Number.isFinite(mark.points) || mark.points < 0 || mark.points > item.maxPoints) {
      throw new RangeError(
        `Note invalide pour « ${item.label} » : ${mark.points} (entre 0 et ${item.maxPoints})`,
      );
    }
    if (mark.eliminatoryFault && !item.eliminatory) {
      throw new RangeError(`« ${item.label} » n'est pas un critère éliminatoire`);
    }
  }
}

/**
 * Practical result: the grid is brought back to 100 points; the test is
 * failed below the pass mark or as soon as an eliminatory fault is recorded,
 * even if other items are not marked yet.
 */
export function evaluatePractical(
  items: readonly GridItem[],
  marks: readonly CriterionMark[],
  passScore: number = PRACTICAL_PASS_SCORE,
): PracticalOutcome {
  if (items.length === 0) throw new RangeError("La grille ne contient aucun critère");
  validateMarks(items, marks);

  const maxPoints = gridMaxPoints(items);
  if (maxPoints <= 0) throw new RangeError("La grille doit totaliser plus de 0 point");

  const marked = new Map(marks.map((mark) => [mark.gridItemId, mark]));
  const points = marks.reduce((sum, mark) => sum + mark.points, 0);
  const score = roundOneDecimal((points / maxPoints) * PRACTICAL_MAX_SCORE);
  const missingItemIds = items.filter((item) => !marked.has(item.id)).map((item) => item.id);
  const faultyItems = items.filter((item) => marked.get(item.id)?.eliminatoryFault);
  const eliminatoryFaults = faultyItems.map((item) => item.id);

  const reasons: string[] = faultyItems.map(
    (item) => `Critère éliminatoire non satisfait : « ${item.label} »`,
  );

  let status: PracticalStatus;
  if (faultyItems.length > 0) {
    status = "failed";
  } else if (missingItemIds.length > 0) {
    status = "incomplete";
    reasons.push(`${missingItemIds.length} critère(s) restant(s) à noter`);
  } else if (score < passScore) {
    status = "failed";
    reasons.push(`Score de ${score}/100, inférieur au minimum de ${passScore}/100`);
  } else {
    status = "passed";
    reasons.push(`Score de ${score}/100, minimum requis ${passScore}/100`);
  }

  return { status, points, maxPoints, score, missingItemIds, eliminatoryFaults, reasons };
}
