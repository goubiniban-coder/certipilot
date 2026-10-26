export interface BillingLine {
  label: string;
  quantity: number;
  unit_price_cents: number;
}

export interface Totals {
  htCents: number;
  vatCents: number;
  ttcCents: number;
}

/** Integer cents throughout: each line is rounded once, then the VAT on the total. */
export function billingTotals(lines: readonly BillingLine[], vatRate: number): Totals {
  const htCents = lines.reduce((sum, l) => sum + Math.round(l.quantity * l.unit_price_cents), 0);
  const vatCents = Math.round((htCents * vatRate) / 100);
  return { htCents, vatCents, ttcCents: htCents + vatCents };
}

/** "12,50", "12.5" or "1 250" to cents; null when it is not a positive amount. */
export function parseEuros(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents >= 0 ? cents : null;
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
