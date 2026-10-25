"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { signIn } from "../actions";

export function SignInForm() {
  const [state, action] = useActionState(signIn, {});
  return (
    <ActionForm action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <SubmitButton size="lg" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </ActionForm>
  );
}
