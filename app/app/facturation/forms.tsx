"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BILLING_LINE_SLOTS } from "@/lib/validation/billing";
import { createBillingDocument } from "./actions";

export function BillingForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createBillingDocument, {});
  const errors = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="bf-kind">Type</Label>
          <NativeSelect id="bf-kind" name="kind" defaultValue="quote">
            <option value="quote">Devis</option>
            <option value="invoice">Facture</option>
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bf-client">Client</Label>
          <NativeSelect id="bf-client" name="clientCompanyId" defaultValue="">
            <option value="">— Aucun (particulier) —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <Field id="bf-title" label="Objet" name="title" errors={errors.title} hint="Ex. : Tests CACES® R.489, session du 12 novembre" />
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-semibold">Lignes</legend>
        {Array.from({ length: BILLING_LINE_SLOTS }, (_, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_7rem] gap-2">
            <Input name={`label${i}`} aria-label={`Désignation ligne ${i + 1}`} placeholder={i === 0 ? "Désignation" : ""} />
            <Input name={`qty${i}`} aria-label={`Quantité ligne ${i + 1}`} inputMode="decimal" placeholder="Qté" />
            <Input name={`price${i}`} aria-label={`Prix unitaire HT ligne ${i + 1}`} inputMode="decimal" placeholder="PU HT €" />
          </div>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="bf-vat" label="TVA (%)" name="vatRate" type="number" step="0.1" defaultValue="20" errors={errors.vatRate} />
        <Field id="bf-due" label="Échéance / validité" name="dueOn" type="date" errors={errors.dueOn} />
      </div>
      <Field id="bf-notes" label="Notes (optionnel)" name="notes" errors={errors.notes} />
      <SubmitButton pendingLabel="Création…">Créer le document</SubmitButton>
    </ActionForm>
  );
}
