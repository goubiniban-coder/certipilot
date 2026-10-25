import type { Violation } from "./violations";

export const IDENTITY_DOCUMENT_TYPES = {
  cni: "Carte nationale d'identité",
  passport: "Passeport",
  residence_permit: "Titre de séjour",
  driving_license: "Permis de conduire",
} as const;

export type IdentityDocumentType = keyof typeof IDENTITY_DOCUMENT_TYPES;

export interface IdentityCheck {
  documentType?: IdentityDocumentType | null;
  documentNumber?: string | null;
  verified: boolean;
  verifiedAt?: string | null;
}

/** The candidate's identity must be checked before any test part starts. */
export function checkIdentity(check: IdentityCheck, candidateName: string): Violation[] {
  if (
    check.verified &&
    check.verifiedAt &&
    check.documentType &&
    check.documentNumber?.trim()
  ) {
    return [];
  }
  return [
    {
      code: "IDENTITY_NOT_VERIFIED",
      severity: "blocking",
      message: `L'identité de ${candidateName} n'a pas été contrôlée (type de pièce, numéro et case « vérifié »). Le test ne peut pas commencer.`,
    },
  ];
}
