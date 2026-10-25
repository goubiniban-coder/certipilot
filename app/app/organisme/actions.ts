"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, organizationSettingsSchema, type FormState } from "@/lib/validation/auth";

export async function updateOrganization(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = organizationSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      certificate_prefix: parsed.data.certificatePrefix,
      retention_months: parsed.data.retentionMonths,
    })
    .eq("id", session.organization.id);
  if (error) return { message: dbErrorMessage(error) };

  revalidatePath("/app", "layout");
  return { ok: true, message: "Paramètres enregistrés." };
}

export async function runGdprPurge(_: FormState): Promise<FormState> {
  await requireSession(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("anonymize_expired_candidates");
  if (error) return { message: dbErrorMessage(error) };
  return { ok: true, message: `${data ?? 0} candidat(s) anonymisé(s).` };
}
