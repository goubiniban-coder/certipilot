"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { categorySchema, gridSchema, recommendationSchema } from "@/lib/validation/referential";

export async function updateRecommendation(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession(["admin"]);
  const parsed = recommendationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, label, validityYears, theoryPassPercent, requiresIpr } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("recommendations")
    .update({
      label,
      validity_years: validityYears,
      theory_pass_percent: theoryPassPercent,
      requires_ipr: requiresIpr,
    })
    .eq("id", id);
  if (error) return { message: dbErrorMessage(error) };

  revalidatePath("/app/referentiel", "layout");
  return { ok: true, message: "Recommandation enregistrée. Les nouvelles durées s'appliquent aux prochains certificats." };
}

export async function saveCategory(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, recommendationId, code, label, validityYears, practicalDurationMinutes, active } =
    parsed.data;

  const values = {
    code,
    label,
    validity_years: validityYears,
    practical_duration_minutes: practicalDurationMinutes,
    active,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(values).eq("id", id)
    : await supabase.from("categories").insert({
        ...values,
        active: true,
        organization_id: session.organization.id,
        recommendation_id: recommendationId,
      });
  if (error) return { message: dbErrorMessage(error) };

  revalidatePath(`/app/referentiel/${recommendationId}`);
  return { ok: true, message: id ? "Catégorie enregistrée." : "Catégorie ajoutée." };
}

export async function saveGrid(input: z.input<typeof gridSchema>): Promise<FormState> {
  await requireSession(["admin"]);
  const parsed = gridSchema.safeParse(input);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Grille invalide." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_grid", {
    p_grid_id: parsed.data.gridId,
    p_name: parsed.data.name,
    p_pass_score: parsed.data.passScore,
    p_items: parsed.data.items,
  });
  if (error) return { message: dbErrorMessage(error) };

  revalidatePath(`/app/referentiel/grilles/${parsed.data.gridId}`);
  return { ok: true, message: "Grille enregistrée." };
}

export async function newGridVersion(formData: FormData) {
  await requireSession(["admin"]);
  const gridId = z.string().uuid().parse(formData.get("gridId"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("new_grid_version", { p_grid_id: gridId });
  if (error) throw new Error(dbErrorMessage(error));
  redirect(`/app/referentiel/grilles/${data as string}`);
}

export async function createGrid(formData: FormData) {
  await requireSession(["admin"]);
  const categoryId = z.string().uuid().parse(formData.get("categoryId"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_grid", { p_category_id: categoryId });
  if (error) throw new Error(dbErrorMessage(error));
  redirect(`/app/referentiel/grilles/${data as string}`);
}
