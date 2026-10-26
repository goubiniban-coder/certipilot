import { describe, expect, it } from "vitest";
import { dueMilestone, type Milestone } from "@/lib/reminders/due";
import { reminderEmail } from "@/lib/reminders/message";

const cert = (expiresOn: string, revoked = false) => ({ certificateId: "c1", expiresOn, revoked });
const none = new Set<Milestone>();

describe("dueMilestone", () => {
  it("does nothing more than six months before expiry", () => {
    expect(dueMilestone(cert("2027-06-01"), none, "2026-10-26")).toBeNull();
  });
  it("sends the six-month reminder inside the window", () => {
    expect(dueMilestone(cert("2027-03-01"), none, "2026-10-26")).toBe("6_months");
  });
  it("sends the two-month reminder close to expiry", () => {
    expect(dueMilestone(cert("2026-12-15"), none, "2026-10-26")).toBe("2_months");
  });
  it("never repeats a milestone", () => {
    expect(dueMilestone(cert("2027-03-01"), new Set<Milestone>(["6_months"]), "2026-10-26")).toBeNull();
    expect(dueMilestone(cert("2026-12-15"), new Set<Milestone>(["2_months"]), "2026-10-26")).toBeNull();
  });
  it("skips the six-month reminder once the two-month one went out", () => {
    expect(dueMilestone(cert("2027-03-01"), new Set<Milestone>(["2_months"]), "2026-10-26")).toBeNull();
  });
  it("ignores revoked and already expired certificates", () => {
    expect(dueMilestone(cert("2026-12-15", true), none, "2026-10-26")).toBeNull();
    expect(dueMilestone(cert("2026-10-01"), none, "2026-10-26")).toBeNull();
  });
});

describe("reminderEmail", () => {
  it("names the holder, the machine family and the date", () => {
    const { subject, text } = reminderEmail({
      holderName: "Jeanne Martin",
      recommendationLabel: "Chariots automoteurs",
      expiresOn: "2026-12-15",
      organizationName: "Centre Démo",
      milestone: "2_months",
    });
    expect(subject).toContain("Jeanne Martin");
    expect(text).toContain("15 décembre 2026");
    expect(text).toContain("Centre Démo");
  });
});
