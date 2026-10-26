import { describe, expect, it } from "vitest";
import { billingTotals, formatEuros, parseEuros } from "@/lib/billing/totals";

describe("billingTotals", () => {
  it("adds the lines then applies the VAT on the total", () => {
    const t = billingTotals(
      [
        { label: "Test R.489", quantity: 4, unit_price_cents: 12_500 },
        { label: "Déplacement", quantity: 1, unit_price_cents: 9_999 },
      ],
      20,
    );
    expect(t).toEqual({ htCents: 59_999, vatCents: 12_000, ttcCents: 71_999 });
  });
  it("handles a zero VAT rate and fractional quantities", () => {
    expect(billingTotals([{ label: "x", quantity: 0.5, unit_price_cents: 1_001 }], 0)).toEqual({
      htCents: 501,
      vatCents: 0,
      ttcCents: 501,
    });
  });
});

describe("parseEuros", () => {
  it("accepts French and English decimals and spaces", () => {
    expect(parseEuros("12,50")).toBe(1250);
    expect(parseEuros("12.5")).toBe(1250);
    expect(parseEuros("1 250")).toBe(125_000);
  });
  it("rejects anything else", () => {
    expect(parseEuros("")).toBeNull();
    expect(parseEuros("abc")).toBeNull();
    expect(parseEuros("-3")).toBeNull();
    expect(parseEuros("1,234")).toBeNull();
  });
  it("formats cents as euros", () => {
    expect(formatEuros(125_000).replace(/\s/g, " ")).toContain("1 250,00");
  });
});
