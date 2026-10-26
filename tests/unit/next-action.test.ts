import { describe, expect, it } from "vitest";
import { complianceMood, complianceScore, nextAction, type NextActionInput } from "@/lib/dashboard/next-action";

const calm: NextActionInput = { expiredAlerts: [], expiringAlerts: 0, sessionToday: null, setupStep: null, renewals: 0 };

describe("nextAction", () => {
  it("puts an expired deadline before anything else", () => {
    const a = nextAction({
      ...calm,
      expiredAlerts: [{ href: "/app/engins", title: "Chariot 2" }, { href: "/app/testeurs", title: "Léa" }],
      sessionToday: { id: "s1", name: "Session" },
      setupStep: { label: "Ajoutez un testeur", href: "/app/testeurs" },
    });
    expect(a).toMatchObject({ tone: "urgent", href: "/app/engins" });
    expect(a.detail).toContain("1 autre");
  });
  it("then today's session, setup, renewals and finally calm", () => {
    expect(nextAction({ ...calm, sessionToday: { id: "s1", name: "S" }, renewals: 3 })).toMatchObject({ tone: "today", href: "/app/sessions/s1" });
    expect(nextAction({ ...calm, setupStep: { label: "Ajoutez un engin", href: "/app/engins" }, renewals: 3 }).tone).toBe("setup");
    expect(nextAction({ ...calm, renewals: 2 }).title).toContain("2 certificats");
    expect(nextAction(calm).tone).toBe("calm");
  });
});

describe("compliance score", () => {
  it("drops with expired and expiring items, never below zero", () => {
    expect(complianceScore(0, 0)).toBe(100);
    expect(complianceScore(1, 2)).toBe(55);
    expect(complianceScore(9, 9)).toBe(0);
  });
  it("labels the score", () => {
    expect(complianceMood(100).tone).toBe("good");
    expect(complianceMood(80).tone).toBe("watch");
    expect(complianceMood(40).tone).toBe("bad");
  });
});
