export type TheoryKind = "qcm" | "qcm_ipr";

export interface TheoryResult {
  kind: TheoryKind;
  score: number;
  maxScore: number;
}

export interface TheoryRequirement {
  /** Pass mark as a percentage of the maximum score (configurable per recommendation). */
  passPercent: number;
  /** R.482 also requires the QCM-IPR. */
  requiresIpr: boolean;
}

export interface TheoryOutcome {
  passed: boolean;
  reasons: string[];
}

export const THEORY_LABELS: Record<TheoryKind, string> = {
  qcm: "QCM théorique",
  qcm_ipr: "QCM-IPR",
};

export function theoryPercent(result: TheoryResult): number {
  if (result.maxScore <= 0) throw new RangeError("Le score maximal doit être supérieur à 0");
  if (result.score < 0 || result.score > result.maxScore) {
    throw new RangeError(`Score théorique invalide : ${result.score}/${result.maxScore}`);
  }
  return (result.score / result.maxScore) * 100;
}

/** Every required theory part must be present and reach the pass mark. */
export function evaluateTheory(
  results: readonly TheoryResult[],
  requirement: TheoryRequirement,
): TheoryOutcome {
  const required: TheoryKind[] = requirement.requiresIpr ? ["qcm", "qcm_ipr"] : ["qcm"];
  const reasons: string[] = [];

  for (const kind of required) {
    const result = results.find((r) => r.kind === kind);
    if (!result) {
      reasons.push(`${THEORY_LABELS[kind]} non passé`);
    } else if (theoryPercent(result) < requirement.passPercent) {
      reasons.push(
        `${THEORY_LABELS[kind]} échoué : ${result.score}/${result.maxScore} (minimum ${requirement.passPercent} %)`,
      );
    }
  }

  return { passed: reasons.length === 0, reasons };
}
