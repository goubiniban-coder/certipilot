import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_STATUS_LABELS,
  certificateExpiryDate,
  certificateStatus,
  validityYears,
} from "@/lib/rules/validity";

describe("validité des certificats", () => {
  it("utilise la durée de la recommandation (5 ans par défaut, 10 ans pour R.482 dans le seed)", () => {
    expect(certificateExpiryDate("2026-10-25", { recommendationYears: 5 })).toBe("2031-10-25");
    expect(certificateExpiryDate("2026-10-25", { recommendationYears: 10 })).toBe("2036-10-25");
  });

  it("applique la surcharge de la catégorie", () => {
    expect(validityYears({ recommendationYears: 5, categoryYears: 3 })).toBe(3);
    expect(validityYears({ recommendationYears: 5, categoryYears: null })).toBe(5);
  });

  it("refuse une durée invalide", () => {
    expect(() => validityYears({ recommendationYears: 0 })).toThrow("Durée de validité invalide");
    expect(() => validityYears({ recommendationYears: 21 })).toThrow("Durée de validité invalide");
    expect(() => validityYears({ recommendationYears: 2.5 })).toThrow("Durée de validité invalide");
  });

  it("calcule le statut", () => {
    const cert = { expiresOn: "2031-10-25" };
    expect(certificateStatus(cert, "2031-10-25")).toBe("valid");
    expect(certificateStatus(cert, "2031-10-26")).toBe("expired");
    expect(certificateStatus({ ...cert, revokedAt: "2027-01-01T10:00:00Z" }, "2027-01-02")).toBe(
      "revoked",
    );
    expect(CERTIFICATE_STATUS_LABELS.revoked).toBe("Révoqué");
  });
});
