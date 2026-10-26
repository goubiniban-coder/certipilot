"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { companyInvitationSchema, fieldErrors, type FormState } from "@/lib/validation/auth";
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

export async function inviteCompanyContact(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin", "secretariat"]);
  const parsed = companyInvitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("company_invitations").insert({
    organization_id: session.organization.id,
    client_company_id: parsed.data.companyId,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    invited_by: session.userId,
  });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath("/app/entreprises");
  return { ok: true, message: "Invitation créée. Copiez le lien ci-dessous et envoyez-le à la personne." };
}

export async function cancelCompanyInvitation(formData: FormData) {
  await requireSession(["admin", "secretariat"]);
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("company_invitations").delete().eq("id", id).is("accepted_at", null);
  revalidatePath("/app/entreprises");
}
