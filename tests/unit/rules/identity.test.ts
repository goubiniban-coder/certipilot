import { describe, expect, it } from "vitest";
import { checkIdentity, IDENTITY_DOCUMENT_TYPES } from "@/lib/rules/identity";

const verified = {
  documentType: "cni" as const,
  documentNumber: "X4RTBPFW4",
  verified: true,
  verifiedAt: "2026-11-02T08:15:00Z",
};

describe("checkIdentity", () => {
  it("accepte une identité contrôlée et horodatée", () => {
    expect(checkIdentity(verified, "Marie Martin")).toEqual([]);
    expect(IDENTITY_DOCUMENT_TYPES.cni).toBe("Carte nationale d'identité");
  });

  it.each([
    { ...verified, verified: false },
    { ...verified, verifiedAt: null },
    { ...verified, documentType: null },
    { ...verified, documentNumber: "  " },
    { ...verified, documentNumber: null },
  ])("bloque un contrôle incomplet (%o)", (check) => {
    const [violation] = checkIdentity(check, "Marie Martin");
    expect(violation?.code).toBe("IDENTITY_NOT_VERIFIED");
    expect(violation?.message).toContain("Marie Martin");
  });
});
