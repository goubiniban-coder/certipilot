import { addYears, compareDates, type IsoDate } from "./dates";
import type { Violation } from "./violations";

export interface EquipmentForTest {
  name: string;
  serialNumber: string;
  categoryId: string;
  lastInspectionOn?: IsoDate | null;
}

/** A periodic inspection is valid for one year. */
export const INSPECTION_VALIDITY_YEARS = 1;

/** First day on which the inspection is no longer valid. */
export function inspectionDueDate(lastInspectionOn: IsoDate): IsoDate {
  return addYears(lastInspectionOn, INSPECTION_VALIDITY_YEARS);
}

/**
 * Equipment used for a test must match the category and have had its
 * periodic inspection less than one year before the test date.
 */
export function checkEquipment(
  equipment: EquipmentForTest,
  categoryId: string,
  categoryLabel: string,
  testDate: IsoDate,
): Violation[] {
  const label = `${equipment.name} (n° ${equipment.serialNumber})`;
  const violations: Violation[] = [];

  if (equipment.categoryId !== categoryId) {
    violations.push({
      code: "EQUIPMENT_WRONG_CATEGORY",
      severity: "blocking",
      message: `L'engin ${label} ne correspond pas à la catégorie ${categoryLabel}.`,
    });
  }

  if (!equipment.lastInspectionOn) {
    violations.push({
      code: "EQUIPMENT_NO_INSPECTION",
      severity: "blocking",
      message: `Aucune vérification périodique enregistrée pour l'engin ${label}. Il ne peut pas servir à un test.`,
    });
  } else if (compareDates(equipment.lastInspectionOn, testDate) > 0) {
    violations.push({
      code: "EQUIPMENT_INSPECTION_IN_FUTURE",
      severity: "blocking",
      message: `La date de vérification de l'engin ${label} est postérieure à la date du test. Corrigez la fiche de l'engin.`,
    });
  } else if (compareDates(testDate, inspectionDueDate(equipment.lastInspectionOn)) >= 0) {
    violations.push({
      code: "EQUIPMENT_INSPECTION_EXPIRED",
      severity: "blocking",
      message: `La vérification périodique de l'engin ${label} date de plus d'un an à la date du test. Faites-la renouveler avant de l'utiliser.`,
    });
  }

  return violations;
}
