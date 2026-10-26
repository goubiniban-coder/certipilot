import { daysBetween, type IsoDate } from "@/lib/rules";

export type Milestone = "6_months" | "2_months";

/** Days before expiry at which each reminder goes out. */
export const MILESTONE_DAYS: Record<Milestone, number> = { "6_months": 180, "2_months": 60 };

export interface ReminderCandidate {
  certificateId: string;
  expiresOn: IsoDate;
  revoked: boolean;
}

/**
 * The most urgent milestone reached by a certificate that has not been reminded for it yet.
 * A missed day is caught up on the next run, but only one e-mail goes out per run and certificate.
 */
export function dueMilestone(
  cert: ReminderCandidate,
  alreadySent: ReadonlySet<Milestone>,
  today: IsoDate,
): Milestone | null {
  if (cert.revoked) return null;
  const left = daysBetween(today, cert.expiresOn);
  if (left < 0) return null;
  if (left <= MILESTONE_DAYS["2_months"]) return alreadySent.has("2_months") ? null : "2_months";
  if (left <= MILESTONE_DAYS["6_months"]) {
    return alreadySent.has("6_months") || alreadySent.has("2_months") ? null : "6_months";
  }
  return null;
}
