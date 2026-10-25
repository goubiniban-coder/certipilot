import { addYears, compareDates, type IsoDate } from "./dates";

export interface ValiditySettings {
  /** Default duration of the recommendation, in years (from the referential). */
  recommendationYears: number;
  /** Optional override on the category, in years. */
  categoryYears?: number | null;
}

export type CertificateStatus = "valid" | "expired" | "revoked";

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  valid: "Valide",
  expired: "Expiré",
  revoked: "Révoqué",
};

/** Validity in years; never hard-coded, always read from the referential. */
export function validityYears(settings: ValiditySettings): number {
  const years = settings.categoryYears ?? settings.recommendationYears;
  if (!Number.isInteger(years) || years < 1 || years > 20) {
    throw new RangeError(`Durée de validité invalide : ${years} an(s)`);
  }
  return years;
}

/** Last day of validity: the anniversary date, N years after issue. */
export function certificateExpiryDate(issuedOn: IsoDate, settings: ValiditySettings): IsoDate {
  return addYears(issuedOn, validityYears(settings));
}

export function certificateStatus(
  certificate: { expiresOn: IsoDate; revokedAt?: string | null },
  today: IsoDate,
): CertificateStatus {
  if (certificate.revokedAt) return "revoked";
  return compareDates(today, certificate.expiresOn) > 0 ? "expired" : "valid";
}
