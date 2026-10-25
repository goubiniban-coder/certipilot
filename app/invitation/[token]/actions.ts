"use server";

import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";
import { acceptInvitationSchema, fieldErrors, type FormState } from "@/lib/validation/auth";

export async function acceptInvitation(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = acceptInvitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { token, password } = parsed.data;

  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_invitation", { p_token: token });
  const invitation = (rows as { email: string; role: AppRole; valid: boolean }[] | null)?.[0];
  if (!invitation?.valid) return { message: "Cette invitation n'est plus valide." };

  // Create the account, or sign in if it already exists (invitation re-opened).
  const signUp = await supabase.auth.signUp({ email: invitation.email, password });
  if (signUp.error || !signUp.data.session) {
    const signIn = await supabase.auth.signInWithPassword({ email: invitation.email, password });
    if (signIn.error) {
      return {
        message: signUp.data.user && !signUp.error
          ? "Compte créé. Confirmez votre adresse avec le lien reçu par e-mail, puis rouvrez cette invitation."
          : "Un compte existe déjà avec cette adresse : saisissez son mot de passe actuel.",
      };
    }
  }

  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { message: dbErrorMessage(error) };
  redirect(homeFor(invitation.role));
}
