"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { clientCompanySchema } from "@/lib/validation/candidates";

export async function saveClientCompany(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin", "secretariat"]);
  const parsed = clientCompanySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, name, siret, contactName, contactEmail, contactPhone } = parsed.data;
  const values = { name, siret, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("client_companies").update(values).eq("id", id)
    : await supabase.from("client_companies").insert({ ...values, organization_id: session.organization.id });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/app/entreprises");
  return { ok: true, message: id ? "Entreprise enregistrée." : "Entreprise ajoutée." };
}
