"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLE_LABELS, type AppRole, type Profile } from "@/lib/types";
import { inviteUser, updateMember } from "./actions";

const ROLES = Object.entries(ROLE_LABELS) as [AppRole, string][];

export function InviteForm() {
  const [state, action] = useActionState(inviteUser, {});
  const errors = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Nom et prénom" name="fullName" required errors={errors.fullName} />
      <Field label="Adresse e-mail" name="email" type="email" required errors={errors.email} />
      <div className="grid gap-2">
        <Label htmlFor="role">Rôle</Label>
        <NativeSelect id="role" name="role" defaultValue="tester">
          {ROLES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <SubmitButton pendingLabel="Création…">Créer l&apos;invitation</SubmitButton>
    </ActionForm>
  );
}

export function MemberRow({ member }: { member: Profile }) {
  const [state, action] = useActionState(updateMember, {});
  return (
    <ActionForm action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={member.id} />
      <NativeSelect
        name="role"
        defaultValue={member.role}
        aria-label={`Rôle de ${member.full_name}`}
        className="w-auto"
      >
        {ROLES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        name="active"
        defaultValue={String(member.active)}
        aria-label={`Statut de ${member.full_name}`}
        className="w-auto"
      >
        <option value="true">Actif</option>
        <option value="false">Désactivé</option>
      </NativeSelect>
      <SubmitButton size="sm" variant="outline" pendingLabel="…">
        Enregistrer
      </SubmitButton>
      {state.message ? (
        <span role="status" className={state.ok ? "text-success" : "font-semibold text-destructive"}>
          {state.message}
        </span>
      ) : null}
    </ActionForm>
  );
}
