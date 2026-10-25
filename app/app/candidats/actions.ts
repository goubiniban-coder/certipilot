"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { parseCandidatesCsv } from "@/lib/csv/candidates";
import { dbErrorMessage, type DbError } from "@/lib/db-errors";
import { importCandidates } from "@/lib/server/import-candidates";
import { photoError, uploadPhoto } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { candidateSchema } from "@/lib/validation/candidates";

export async function saveCandidate(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin", "secretariat"]);
  const { photo, ...fields } = Object.fromEntries(formData);
  const parsed = candidateSchema.safeParse(fields);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const c = parsed.data;

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const error = photoError(photo);
    if (error) return { fieldErrors: { photo: [error] } };
    try {
      photoPath = await uploadPhoto(session.organization.id, "candidates", photo);
    } catch (e) {
      return { message: (e as Error).message };
    }
  }

  const values = {
    last_name: c.lastName,
    first_name: c.firstName,
    birth_date: c.birthDate,
    email: c.email,
    client_company_id: c.clientCompanyId,
    trainer_tester_id: c.trainerTesterId,
    trainer_name: c.trainerName,
    ...(photoPath ? { photo_path: photoPath } : {}),
  };
  const supabase = await createClient();
  if (c.id) {
    const { error } = await supabase.from("candidates").update(values).eq("id", c.id);
    if (error) return { message: dbErrorMessage(error) };
    revalidatePath(`/app/candidats/${c.id}`);
    return { ok: true, message: "Fiche enregistrée." };
  }
  const { data, error } = await supabase
    .from("candidates")
    .insert({ ...values, organization_id: session.organization.id })
    .select("id")
    .single();
  if (error) return { message: dbErrorMessage(error) };
  redirect(`/app/candidats/${data.id}`);
}

export async function importCandidatesCsv(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin", "secretariat"]);
  const file = formData.get("file");
  const sessionId = (formData.get("sessionId") as string | null) || null;
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { file: ["Choisissez un fichier CSV."] } };
  if (file.size > 2 * 1024 * 1024) return { fieldErrors: { file: ["Le fichier ne doit pas dépasser 2 Mo."] } };

  const { rows, errors } = parseCandidatesCsv(await file.text());
  if (rows.length === 0) {
    return { message: errors.map((e) => e.message).join(" ") || "Aucun candidat trouvé dans le fichier." };
  }

  try {
    const result = await importCandidates(session.organization.id, rows, sessionId);
    if (sessionId) revalidatePath(`/app/sessions/${sessionId}`);
    revalidatePath("/app/candidats");
    const parts = [
      `${result.created} candidat(s) créé(s)`,
      result.existing ? `${result.existing} déjà connu(s)` : null,
      sessionId ? `${result.addedToSession} ajouté(s) à la session` : null,
    ].filter(Boolean);
    const skipped = errors.length ? ` ${errors.length} ligne(s) ignorée(s) : ${errors.map((e) => e.message).join(" ")}` : "";
    return { ok: errors.length === 0, message: `Import terminé : ${parts.join(", ")}.${skipped}` };
  } catch (error) {
    return { message: dbErrorMessage(error as DbError) };
  }
}
