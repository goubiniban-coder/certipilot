"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { personalCacesSchema, qualificationSchema, testerSchema } from "@/lib/validation/resources";

const BACK_OFFICE = ["admin", "secretariat"] as const;

export async function saveTester(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const parsed = testerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, fullName, email, active } = parsed.data;

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("testers")
      .update({ full_name: fullName, email, active })
      .eq("id", id);
    if (error) return { message: dbErrorMessage(error) };
    revalidatePath(`/app/testeurs/${id}`);
    return { ok: true, message: "Fiche enregistrée." };
  }

  const { data, error } = await supabase
    .from("testers")
    .insert({ organization_id: session.organization.id, full_name: fullName, email })
    .select("id")
    .single();
  if (error) return { message: dbErrorMessage(error) };
  redirect(`/app/testeurs/${data.id}`);
}

export async function addQualification(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const parsed = qualificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("tester_qualifications").upsert(
    {
      organization_id: session.organization.id,
      tester_id: parsed.data.testerId,
      category_id: parsed.data.categoryId,
      granted_on: parsed.data.grantedOn,
      active: true,
    },
    { onConflict: "tester_id,category_id" },
  );
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath(`/app/testeurs/${parsed.data.testerId}`);
  return { ok: true, message: "Habilitation enregistrée." };
}

export async function toggleQualification(formData: FormData) {
  await requireSession(BACK_OFFICE);
  const id = z.string().uuid().parse(formData.get("id"));
  const testerId = z.string().uuid().parse(formData.get("testerId"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("tester_qualifications").update({ active }).eq("id", id);
  revalidatePath(`/app/testeurs/${testerId}`);
}

export async function addPersonalCaces(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const parsed = personalCacesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  if (data.issuerSiret === session.organization.siret) {
    return {
      fieldErrors: {
        issuerSiret: [
          "Ce CACES® a été délivré par votre propre organisme : un testeur doit détenir un CACES® délivré par un autre OTC.",
        ],
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tester_personal_caces").insert({
    organization_id: session.organization.id,
    tester_id: data.testerId,
    category_id: data.categoryId,
    certificate_number: data.certificateNumber,
    issuer_name: data.issuerName,
    issuer_siret: data.issuerSiret,
    expires_on: data.expiresOn,
  });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath(`/app/testeurs/${data.testerId}`);
  return { ok: true, message: "CACES® personnel enregistré." };
}

export async function deletePersonalCaces(formData: FormData) {
  await requireSession(BACK_OFFICE);
  const id = z.string().uuid().parse(formData.get("id"));
  const testerId = z.string().uuid().parse(formData.get("testerId"));
  const supabase = await createClient();
  await supabase.from("tester_personal_caces").delete().eq("id", id);
  revalidatePath(`/app/testeurs/${testerId}`);
}
