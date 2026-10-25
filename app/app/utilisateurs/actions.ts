"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, invitationSchema, type FormState } from "@/lib/validation/auth";

export async function inviteUser(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = invitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", parsed.data.email)
    .maybeSingle();
  if (existing) return { message: "Cette personne fait déjà partie de votre organisme." };

  const { error } = await supabase.from("invitations").insert({
    organization_id: session.organization.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    invited_by: session.userId,
  });
  if (error) return { message: dbErrorMessage(error) };

  revalidatePath("/app/utilisateurs");
  return {
    ok: true,
    message: `Invitation créée pour ${parsed.data.fullName}. Copiez le lien ci-dessous et envoyez-le-lui.`,
  };
}

export async function cancelInvitation(formData: FormData) {
  await requireSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id).is("accepted_at", null);
  revalidatePath("/app/utilisateurs");
}

const memberSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "secretariat", "tester"]),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function updateMember(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Données invalides." };
  if (parsed.data.id === session.userId) {
    return { message: "Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, active: parsed.data.active })
    .eq("id", parsed.data.id);
  if (error) return { message: dbErrorMessage(error) };

  // A member who becomes a tester needs a tester record (qualifications, CACES®).
  if (parsed.data.role === "tester") {
    const { data: tester } = await supabase
      .from("testers")
      .select("id")
      .eq("profile_id", parsed.data.id)
      .maybeSingle();
    if (!tester) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", parsed.data.id)
        .single();
      await supabase.from("testers").insert({
        organization_id: session.organization.id,
        profile_id: parsed.data.id,
        full_name: profile?.full_name,
        email: profile?.email,
      });
    }
  }

  revalidatePath("/app/utilisateurs");
  return { ok: true, message: "Modification enregistrée." };
}
