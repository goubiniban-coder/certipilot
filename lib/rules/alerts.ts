import { addMonths, compareDates, daysBetween, type IsoDate } from "./dates";

/** Testers' CACES® and equipment inspections are flagged this many days ahead. */
export const EXPIRY_ALERT_DAYS = 60;
/** Renewals are listed this many months ahead on the dashboard. */
export const RENEWAL_HORIZON_MONTHS = 6;

export type ExpiryLevel = "ok" | "expiring" | "expired";

export interface ExpiryState {
  level: ExpiryLevel;
  /** Days left before the due date (negative once past). */
  daysLeft: number;
}

/**
 * By default `dueOn` is the first day the item is no longer valid (equipment
 * inspections). Pass `inclusive` when it is the last valid day (CACES® expiry dates).
 */
export function expiryState(
  dueOn: IsoDate,
  today: IsoDate,
  options: { alertDays?: number; inclusive?: boolean } = {},
): ExpiryState {
  const alertDays = options.alertDays ?? EXPIRY_ALERT_DAYS;
  const daysLeft = daysBetween(today, dueOn);
  const expired = options.inclusive ? daysLeft < 0 : daysLeft <= 0;
  if (expired) return { level: "expired", daysLeft };
  if (daysLeft < alertDays) return { level: "expiring", daysLeft };
  return { level: "ok", daysLeft };
}

export interface RenewalCandidate {
  certificateId: string;
  clientCompanyId: string | null;
  expiresOn: IsoDate;
  revoked: boolean;
}

export interface RenewalGroup<T extends RenewalCandidate> {
  clientCompanyId: string | null;
  certificates: T[];
}

/** Certificates still valid today that expire within the horizon, per client company. */
export function renewalsDue<T extends RenewalCandidate>(
  certificates: readonly T[],
  today: IsoDate,
  horizonMonths: number = RENEWAL_HORIZON_MONTHS,
): RenewalGroup<T>[] {
  const limit = addMonths(today, horizonMonths);
  const groups = new Map<string | null, T[]>();

  const due = certificates
    .filter(
      (c) =>
        !c.revoked &&
        compareDates(c.expiresOn, today) >= 0 &&
        compareDates(c.expiresOn, limit) <= 0,
    )
    .sort((a, b) => compareDates(a.expiresOn, b.expiresOn));

  for (const certificate of due) {
    const list = groups.get(certificate.clientCompanyId) ?? [];
    list.push(certificate);
    groups.set(certificate.clientCompanyId, list);
  }

  return [...groups.entries()].map(([clientCompanyId, list]) => ({
    clientCompanyId,
    certificates: list,
  }));
}
