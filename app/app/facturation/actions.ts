"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { billingDocumentSchema, readBillingLines } from "@/lib/validation/billing";

export async function createBillingDocument(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin", "secretariat"]);
  const parsed = billingDocumentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { lines, error: lineError } = readBillingLines(formData);
  if (lineError) return { message: lineError };

  const supabase = await createClient();
  const { error } = await supabase.from("billing_documents").insert({
    organization_id: session.organization.id,
    kind: parsed.data.kind,
    client_company_id: parsed.data.clientCompanyId,
    title: parsed.data.title,
    due_on: parsed.data.dueOn,
    vat_rate: parsed.data.vatRate,
    notes: parsed.data.notes,
    lines,
    // Replaced by the database trigger: the sequence is gap-free.
    number: "pending",
  });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/app/facturation");
  return { ok: true, message: parsed.data.kind === "quote" ? "Devis créé." : "Facture créée." };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "sent", "accepted", "paid", "cancelled"]),
});

export async function setBillingStatus(formData: FormData) {
  await requireSession(["admin", "secretariat"]);
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("billing_documents").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  revalidatePath("/app/facturation");
}

/** Turns an accepted quote into a draft invoice with the same client and lines. */
export async function invoiceFromQuote(formData: FormData) {
  const session = await requireSession(["admin", "secretariat"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("billing_documents")
    .select("id, client_company_id, title, vat_rate, lines, notes")
    .eq("id", id)
    .eq("kind", "quote")
    .maybeSingle();
  if (!quote) return;
  await supabase.from("billing_documents").insert({
    organization_id: session.organization.id,
    kind: "invoice",
    number: "pending",
    client_company_id: quote.client_company_id,
    title: quote.title,
    vat_rate: quote.vat_rate,
    lines: quote.lines,
    notes: quote.notes,
    source_quote_id: quote.id,
  });
  revalidatePath("/app/facturation");
  redirect("/app/facturation");
}

export async function deleteDraftQuote(formData: FormData) {
  await requireSession(["admin", "secretariat"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("billing_documents").delete().eq("id", id).eq("kind", "quote").eq("status", "draft");
  revalidatePath("/app/facturation");
}
