"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation } from "./actions";

export function AcceptInvitationForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(acceptInvitation, {});
  return (
    <ActionForm action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" value={email} readOnly disabled />
      </div>
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.password}
        hint="Au moins 10 caractères."
      />
      <SubmitButton size="lg" pendingLabel="Activation…">
        Activer mon compte
      </SubmitButton>
    </ActionForm>
  );
}
