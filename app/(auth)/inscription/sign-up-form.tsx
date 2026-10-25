"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { signUp } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, {});
  const errors = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;

  return (
    <ActionForm action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <fieldset className="grid gap-5">
        <legend className="mb-2 text-lg font-bold">Votre organisme</legend>
        <Field label="Nom de l'organisme" name="organizationName" required errors={errors.organizationName} />
        <Field
          label="SIRET"
          name="siret"
          inputMode="numeric"
          required
          errors={errors.siret}
          hint="14 chiffres. Il sert aussi à vérifier que les CACES® de vos testeurs viennent d'un autre organisme."
        />
        <Field
          label="Préfixe des numéros de certificat"
          name="certificatePrefix"
          required
          maxLength={10}
          errors={errors.certificatePrefix}
          hint="Par exemple OTC59 : les certificats seront numérotés OTC59-2026-000001."
        />
      </fieldset>
      <fieldset className="grid gap-5">
        <legend className="mb-2 text-lg font-bold">Vous, responsable du centre</legend>
        <Field label="Nom et prénom" name="fullName" autoComplete="name" required errors={errors.fullName} />
        <Field label="Adresse e-mail" name="email" type="email" autoComplete="email" required errors={errors.email} />
        <Field
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          errors={errors.password}
          hint="Au moins 10 caractères."
        />
      </fieldset>
      <SubmitButton size="lg" pendingLabel="Inscription…">
        Créer l&apos;espace de mon organisme
      </SubmitButton>
    </ActionForm>
  );
}
