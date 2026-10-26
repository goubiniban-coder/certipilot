"use server";

import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";
import {
  fieldErrors,
  signInSchema,
  signUpSchema,
  type FormState,
} from "@/lib/validation/auth";

interface PendingOrganization {
  organizationName: string;
  siret: string;
  certificatePrefix: string;
  fullName: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Creates the OTC saved at sign-up, once the e-mail is confirmed and the user signs in. */
async function createPendingOrganization(supabase: Supabase, pending: PendingOrganization) {
  return supabase.rpc("create_organization", {
    p_name: pending.organizationName,
    p_siret: pending.siret,
    p_certificate_prefix: pending.certificatePrefix,
    p_full_name: pending.fullName,
  });
}

async function roleOf(supabase: Supabase, userId: string): Promise<AppRole | null> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as AppRole | undefined) ?? null;
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") {
    return { message: "Adresse e-mail non confirmée. Ouvrez le lien reçu par e-mail, puis reconnectez-vous." };
  }
  if (error || !data.user) {
    return { message: "Adresse e-mail ou mot de passe incorrect." };
  }

  let role = await roleOf(supabase, data.user.id);
  const pending = data.user.user_metadata?.pending_organization as PendingOrganization | undefined;
  if (!role && pending) {
    const { error: orgError } = await createPendingOrganization(supabase, pending);
    if (orgError) return { message: dbErrorMessage(orgError) };
    await supabase.auth.updateUser({ data: { pending_organization: null } });
    role = "admin";
  }
  if (!role) {
    await supabase.auth.signOut();
    return {
      message:
        "Ce compte n'est rattaché à aucun organisme. Demandez une invitation à votre responsable.",
    };
  }

  await supabase.rpc("log_event", { p_action: "sign_in" });
  redirect(homeFor(role));
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password, ...pending } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: pending.fullName, pending_organization: pending } },
  });
  if (error) {
    return {
      message: /registered|already/i.test(error.message)
        ? "Un compte existe déjà avec cette adresse e-mail. Connectez-vous."
        : "L'inscription a échoué. Vérifiez les informations saisies.",
    };
  }

  // E-mail confirmation enabled: the organization is created at first sign-in.
  if (!data.session) {
    return {
      ok: true,
      message:
        "Compte créé. Ouvrez le lien reçu par e-mail pour confirmer votre adresse, puis connectez-vous.",
    };
  }

  const { error: orgError } = await createPendingOrganization(supabase, pending);
  if (orgError) return { message: dbErrorMessage(orgError) };
  await supabase.auth.updateUser({ data: { pending_organization: null } });
  redirect("/app");
}
