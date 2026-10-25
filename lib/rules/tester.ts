import { compareDates, type IsoDate } from "./dates";
import type { Violation } from "./violations";

export interface TesterQualification {
  categoryId: string;
  active: boolean;
}

export interface TesterPersonalCaces {
  categoryId: string;
  /** SIRET of the OTC that issued the tester's own CACES®. */
  issuerSiret: string;
  expiresOn: IsoDate;
}

export interface TesterProfile {
  id: string;
  fullName: string;
  qualifications: readonly TesterQualification[];
  personalCaces: readonly TesterPersonalCaces[];
}

export interface CandidateTraining {
  fullName: string;
  /** Tester record of the trainer, when the trainer is also a tester of the OTC. */
  trainerTesterId?: string | null;
  /** Free-text trainer name, when known. */
  trainerName?: string | null;
}

export interface AssignmentContext {
  tester: TesterProfile;
  candidate: CandidateTraining;
  categoryId: string;
  categoryLabel: string;
  testDate: IsoDate;
  /** SIRET of the OTC running the test. */
  organizationSiret: string;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z]+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .sort()
    .join(" ");
}

export function normalizeSiret(siret: string): string {
  return siret.replace(/\s+/g, "");
}

/**
 * The practical tester must never have trained the candidate. Linked records
 * block; a matching free-text name only warns, as homonyms exist.
 */
export function checkTrainerConflict(
  tester: TesterProfile,
  candidate: CandidateTraining,
): Violation[] {
  if (candidate.trainerTesterId && candidate.trainerTesterId === tester.id) {
    return [
      {
        code: "TRAINER_CONFLICT",
        severity: "blocking",
        message: `${tester.fullName} a formé ${candidate.fullName} : un testeur ne peut pas évaluer un candidat qu'il a formé. Affectez un autre testeur.`,
      },
    ];
  }
  if (
    !candidate.trainerTesterId &&
    candidate.trainerName &&
    normalizeName(candidate.trainerName) === normalizeName(tester.fullName)
  ) {
    return [
      {
        code: "TRAINER_NAME_MATCH",
        severity: "warning",
        message: `Le formateur déclaré de ${candidate.fullName} (« ${candidate.trainerName} ») porte le même nom que le testeur. Vérifiez qu'il ne s'agit pas de la même personne.`,
      },
    ];
  }
  return [];
}

/** Qualification by the OTC and a valid personal CACES® from another OTC. */
export function checkTesterCompetence(context: AssignmentContext): Violation[] {
  const { tester, categoryId, categoryLabel, testDate, organizationSiret } = context;
  const violations: Violation[] = [];

  const qualified = tester.qualifications.some((q) => q.categoryId === categoryId && q.active);
  if (!qualified) {
    violations.push({
      code: "TESTER_NOT_QUALIFIED",
      severity: "blocking",
      message: `${tester.fullName} n'est pas habilité par l'organisme pour la catégorie ${categoryLabel}.`,
    });
  }

  const caces = tester.personalCaces.filter((c) => c.categoryId === categoryId);
  const fromOtherOtc = caces.filter(
    (c) => normalizeSiret(c.issuerSiret) !== normalizeSiret(organizationSiret),
  );
  const valid = fromOtherOtc.filter((c) => compareDates(c.expiresOn, testDate) >= 0);

  if (caces.length === 0) {
    violations.push({
      code: "TESTER_CACES_MISSING",
      severity: "blocking",
      message: `Aucun CACES® personnel enregistré pour ${tester.fullName} en catégorie ${categoryLabel}.`,
    });
  } else if (fromOtherOtc.length === 0) {
    violations.push({
      code: "TESTER_CACES_SAME_OTC",
      severity: "blocking",
      message: `Le CACES® personnel de ${tester.fullName} en catégorie ${categoryLabel} a été délivré par votre propre organisme : il doit l'être par un autre OTC.`,
    });
  } else if (valid.length === 0) {
    violations.push({
      code: "TESTER_CACES_EXPIRED",
      severity: "blocking",
      message: `Le CACES® personnel de ${tester.fullName} en catégorie ${categoryLabel} n'est plus valide à la date du test.`,
    });
  }

  return violations;
}

/** All checks for assigning a practical tester to a candidate and category. */
export function checkTesterAssignment(context: AssignmentContext): Violation[] {
  return [
    ...checkTrainerConflict(context.tester, context.candidate),
    ...checkTesterCompetence(context),
  ];
}
