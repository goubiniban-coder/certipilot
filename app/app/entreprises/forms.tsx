"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import type { ClientCompany } from "@/lib/types";
import { saveClientCompany } from "./actions";

export function ClientCompanyForm({ company }: { company?: ClientCompany }) {
  const [state, action] = useActionState(saveClientCompany, {});
  const errors = state.fieldErrors ?? {};
  const p = company?.id ?? "new";
  return (
    <ActionForm action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      {company ? <input type="hidden" name="id" value={company.id} /> : null}
      <Field id={`${p}-name`} label="Raison sociale" name="name" defaultValue={company?.name} errors={errors.name} />
      <Field id={`${p}-siret`} label="SIRET" name="siret" inputMode="numeric" defaultValue={company?.siret ?? ""} errors={errors.siret} />
      <Field id={`${p}-contact`} label="Contact" name="contactName" defaultValue={company?.contact_name ?? ""} />
      <Field id={`${p}-email`} label="E-mail du contact" name="contactEmail" type="email" defaultValue={company?.contact_email ?? ""} errors={errors.contactEmail} />
      <Field id={`${p}-phone`} label="Téléphone du contact" name="contactPhone" type="tel" defaultValue={company?.contact_phone ?? ""} />
      <SubmitButton>{company ? "Enregistrer" : "Ajouter l'entreprise"}</SubmitButton>
    </ActionForm>
  );
}
