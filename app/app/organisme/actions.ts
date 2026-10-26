"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createAdminClient, createClient } from "@/lib/supabase/server";
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
      address: parsed.data.address,
      vat_number: parsed.data.vatNumber,
    })
    .eq("id", session.organization.id);
  if (error) return { message: dbErrorMessage(error) };

  revalidatePath("/app", "layout");
  return { ok: true, message: "Paramètres enregistrés." };
}

export async function runGdprPurge(_: FormState): Promise<FormState> {
  await requireSession(["admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("anonymize_expired_candidates")
    .single<{ anonymized_count: number; photo_paths: string[] }>();
  if (error) return { message: dbErrorMessage(error) };
  // The photos go too: the database cannot reach the Storage bucket itself.
  if (data.photo_paths.length) {
    const { error: removeError } = await createAdminClient().storage.from("candidate-photos").remove(data.photo_paths);
    if (removeError) {
      console.error("Photos non supprimées après la purge RGPD", data.photo_paths, removeError);
      return {
        message: `${data.anonymized_count} candidat(s) anonymisé(s), mais ${data.photo_paths.length} photo(s) n'ont pas pu être effacées du stockage. Contactez le support technique.`,
      };
    }
  }
  return { ok: true, message: `${data.anonymized_count} candidat(s) anonymisé(s), ${data.photo_paths.length} photo(s) supprimée(s).` };
}
