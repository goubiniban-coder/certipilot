"use client";

import { useActionState } from "react";
import { CategorySelect } from "@/components/forms/category-select";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { CategoryOption } from "@/lib/queries/referential";
import type { Tester } from "@/lib/types";
import { addPersonalCaces, addQualification, saveTester } from "./actions";

export function TesterForm({ tester }: { tester?: Tester }) {
  const [state, action] = useActionState(saveTester, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      {tester ? <input type="hidden" name="id" value={tester.id} /> : null}
      <Field label="Nom et prénom" name="fullName" defaultValue={tester?.full_name} errors={errors.fullName} />
      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        defaultValue={tester?.email ?? ""}
        errors={errors.email}
        hint="Pour lui envoyer une invitation à l'application testeur."
      />
      {tester ? (
        <div className="grid gap-2">
          <Label htmlFor="active">Statut</Label>
          <NativeSelect id="active" name="active" defaultValue={String(tester.active)}>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </NativeSelect>
        </div>
      ) : null}
      <SubmitButton>{tester ? "Enregistrer" : "Créer la fiche"}</SubmitButton>
    </form>
  );
}

export function QualificationForm({ testerId, options, today }: { testerId: string; options: CategoryOption[]; today: string }) {
  const [state, action] = useActionState(addQualification, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 md:grid-cols-[1fr_12rem_auto] md:items-end" noValidate>
      <div className="md:col-span-3">
        <FormMessage state={state} />
      </div>
      <input type="hidden" name="testerId" value={testerId} />
      <CategorySelect id="qualification-category" options={options} errors={errors.categoryId} />
      <Field id="qualification-date" label="Habilité le" name="grantedOn" type="date" defaultValue={today} errors={errors.grantedOn} />
      <SubmitButton>Habiliter</SubmitButton>
    </form>
  );
}

export function PersonalCacesForm({ testerId, options }: { testerId: string; options: CategoryOption[] }) {
  const [state, action] = useActionState(addPersonalCaces, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2" noValidate>
      <div className="md:col-span-2">
        <FormMessage state={state} />
      </div>
      <input type="hidden" name="testerId" value={testerId} />
      <CategorySelect id="caces-category" options={options} errors={errors.categoryId} />
      <Field id="caces-number" label="Numéro du CACES®" name="certificateNumber" errors={errors.certificateNumber} />
      <Field id="caces-issuer" label="Organisme émetteur" name="issuerName" errors={errors.issuerName} />
      <Field id="caces-siret" label="SIRET de l'organisme émetteur" name="issuerSiret" inputMode="numeric" errors={errors.issuerSiret} />
      <Field id="caces-expires" label="Date d'échéance" name="expiresOn" type="date" errors={errors.expiresOn} />
      <div className="md:col-span-2">
        <SubmitButton>Ajouter le CACES®</SubmitButton>
      </div>
    </form>
  );
}
