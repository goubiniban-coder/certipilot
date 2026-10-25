/**
 * Calendar dates are handled as ISO strings ("YYYY-MM-DD") to stay free of
 * time zones: a test taken on 2026-03-01 in Paris is on 2026-03-01 everywhere.
 */
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function parts(date: IsoDate): [number, number, number] {
  const match = ISO_DATE.exec(date);
  if (!match) throw new RangeError(`Date invalide : « ${date} » (format attendu AAAA-MM-JJ)`);
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError(`Date invalide : « ${date} »`);
  }
  return [year, month, day];
}

function toUtc(date: IsoDate): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  try {
    parts(value);
    return true;
  } catch {
    return false;
  }
}

/** Calendar date of an instant in a given time zone (default Europe/Paris). */
export function toIsoDate(instant: Date, timeZone = "Europe/Paris"): IsoDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Adds whole years; 29 February falls back to 28 February in common years. */
export function addYears(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = parts(date);
  const targetYear = y + years;
  const lastDay = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
  return fromUtc(Date.UTC(targetYear, m - 1, Math.min(d, lastDay)));
}

/** Adds whole months, clamping to the last day of the target month. */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = parts(date);
  const index = y * 12 + (m - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = index - targetYear * 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(targetYear, targetMonth, Math.min(d, lastDay)));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Number of days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return Math.sign(toUtc(a) - toUtc(b));
}
