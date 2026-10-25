import { describe, expect, it } from "vitest";
import { expiryState, renewalsDue } from "@/lib/rules/alerts";
import { hasBlocking } from "@/lib/rules/violations";

describe("expiryState", () => {
  it("alerte à moins de 60 jours", () => {
    expect(expiryState("2026-12-24", "2026-10-25")).toEqual({ level: "ok", daysLeft: 60 });
    expect(expiryState("2026-12-23", "2026-10-25")).toEqual({ level: "expiring", daysLeft: 59 });
  });

  it("distingue échéance exclusive (engins) et inclusive (CACES®)", () => {
    expect(expiryState("2026-10-25", "2026-10-25").level).toBe("expired");
    expect(expiryState("2026-10-25", "2026-10-25", { inclusive: true }).level).toBe("expiring");
    expect(expiryState("2026-10-24", "2026-10-25", { inclusive: true }).level).toBe("expired");
  });

  it("accepte un délai d'alerte paramétré", () => {
    expect(expiryState("2026-11-30", "2026-10-25", { alertDays: 30 }).level).toBe("ok");
  });
});

describe("renewalsDue", () => {
  const certs = [
    { certificateId: "1", clientCompanyId: "acme", expiresOn: "2027-02-01", revoked: false },
    { certificateId: "2", clientCompanyId: "acme", expiresOn: "2026-12-01", revoked: false },
    { certificateId: "3", clientCompanyId: null, expiresOn: "2027-04-25", revoked: false },
    { certificateId: "4", clientCompanyId: "acme", expiresOn: "2027-04-26", revoked: false },
    { certificateId: "5", clientCompanyId: "acme", expiresOn: "2026-10-24", revoked: false },
    { certificateId: "6", clientCompanyId: "beta", expiresOn: "2026-12-01", revoked: true },
  ];

  it("liste les recyclages des 6 prochains mois par entreprise", () => {
    const groups = renewalsDue(certs, "2026-10-25");
    expect(groups.map((g) => [g.clientCompanyId, g.certificates.map((c) => c.certificateId)])).toEqual([
      ["acme", ["2", "1"]],
      [null, ["3"]],
    ]);
  });

  it("accepte un horizon paramétré", () => {
    expect(renewalsDue(certs, "2026-10-25", 1).flatMap((g) => g.certificates)).toEqual([]);
  });
});

describe("hasBlocking", () => {
  it("détecte une violation bloquante", () => {
    expect(hasBlocking([])).toBe(false);
    expect(hasBlocking([{ code: "X", severity: "warning", message: "" }])).toBe(false);
    expect(hasBlocking([{ code: "X", severity: "blocking", message: "" }])).toBe(true);
  });
});
