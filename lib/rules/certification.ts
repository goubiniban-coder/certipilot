import type { PracticalStatus } from "./scoring";

export interface CategoryAttempt {
  categoryId: string;
  practicalStatus: PracticalStatus;
}

/**
 * A category is obtained only when the theory of its recommendation and the
 * practical test of the category are both passed.
 */
export function obtainedCategories(
  theoryPassed: boolean,
  attempts: readonly CategoryAttempt[],
): string[] {
  if (!theoryPassed) return [];
  return [
    ...new Set(
      attempts.filter((a) => a.practicalStatus === "passed").map((a) => a.categoryId),
    ),
  ];
}

/** Unique certificate number: PREFIX-YEAR-000123. */
export function formatCertificateNumber(prefix: string, year: number, sequence: number): string {
  const cleanPrefix = prefix.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(cleanPrefix)) {
    throw new RangeError("Le préfixe doit contenir 2 à 10 lettres ou chiffres");
  }
  if (!Number.isInteger(year) || year < 2020 || year > 9999) {
    throw new RangeError(`Année invalide : ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Numéro de séquence invalide : ${sequence}`);
  }
  return `${cleanPrefix}-${year}-${String(sequence).padStart(6, "0")}`;
}
