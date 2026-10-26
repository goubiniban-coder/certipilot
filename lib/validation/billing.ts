import { z } from "zod";
import { parseEuros, type BillingLine } from "@/lib/billing/totals";

export const BILLING_LINE_SLOTS = 6;

export const billingDocumentSchema = z.object({
  kind: z.enum(["quote", "invoice"]),
  clientCompanyId: z.string().uuid("Choisissez un client").or(z.literal("")).transform((v) => v || null),
  title: z.string().trim().min(3, "Objet obligatoire"),
  dueOn: z.string().optional().transform((v) => v || null),
  vatRate: z.coerce.number({ error: "Taux invalide" }).min(0, "Taux invalide").max(100, "Taux invalide"),
  notes: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/** Reads the fixed line slots of the form; blank slots are skipped, half-filled ones are an error. */
export function readBillingLines(formData: FormData): { lines: BillingLine[]; error?: string } {
  const lines: BillingLine[] = [];
  for (let i = 0; i < BILLING_LINE_SLOTS; i++) {
    const label = String(formData.get(`label${i}`) ?? "").trim();
    const qty = String(formData.get(`qty${i}`) ?? "").trim();
    const price = String(formData.get(`price${i}`) ?? "").trim();
    if (!label && !qty && !price) continue;
    const quantity = Number(qty.replace(",", "."));
    const cents = parseEuros(price);
    if (!label || !(quantity > 0) || cents === null) {
      return { lines, error: `Ligne ${i + 1} : désignation, quantité et prix unitaire sont obligatoires.` };
    }
    lines.push({ label, quantity, unit_price_cents: cents });
  }
  if (!lines.length) return { lines, error: "Ajoutez au moins une ligne." };
  return { lines };
}
