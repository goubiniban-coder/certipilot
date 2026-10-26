"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import type { Organization } from "@/lib/types";
import { runGdprPurge, updateOrganization } from "./actions";

export function OrganizationForm({ organization }: { organization: Organization }) {
  const [state, action] = useActionState(updateOrganization, {});
  const errors = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="Nom de l'organisme" name="name" defaultValue={organization.name} errors={errors.name} />
      <Field label="SIRET" name="siret" defaultValue={organization.siret} disabled hint="Le SIRET ne peut pas être modifié." />
      <Field label="Adresse (devis et factures)" name="address" defaultValue={organization.address ?? ""} errors={errors.address} />
      <Field label="N° de TVA intracommunautaire" name="vatNumber" defaultValue={organization.vat_number ?? ""} errors={errors.vatNumber} />
      <Field
        label="Préfixe des numéros de certificat"
        name="certificatePrefix"
        defaultValue={organization.certificate_prefix}
        errors={errors.certificatePrefix}
        hint="S'applique aux prochains certificats uniquement."
      />
      <Field
        label="Durée de conservation des données des candidats (mois)"
        name="retentionMonths"
        type="number"
        min={12}
        max={600}
        defaultValue={organization.retention_months}
        errors={errors.retentionMonths}
        hint="Délai après la fin de validité du dernier certificat et la dernière session du candidat."
      />
      <SubmitButton>Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function GdprPurgeForm() {
  const [state, action] = useActionState(runGdprPurge, {});
  return (
    <ActionForm action={action} className="grid gap-4">
      <FormMessage state={state} />
      <SubmitButton variant="outline" pendingLabel="Anonymisation…">
        Anonymiser les candidats hors délai
      </SubmitButton>
    </ActionForm>
  );
}
