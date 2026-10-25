"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState } from "react";
import { Field, FieldErrors } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Candidate } from "@/lib/types";
import { importCandidatesCsv, saveCandidate } from "./actions";

interface Option {
  id: string;
  name: string;
}

export function CandidateForm({
  candidate,
  companies,
  testers,
}: {
  candidate?: Candidate;
  companies: Option[];
  testers: Option[];
}) {
  const [state, action] = useActionState(saveCandidate, {});
  const errors = state.fieldErrors ?? {};
  const p = candidate?.id ?? "new";
  return (
    <ActionForm action={action} className="grid gap-4 md:grid-cols-2" noValidate>
      <div className="md:col-span-2">
        <FormMessage state={state} />
      </div>
      {candidate ? <input type="hidden" name="id" value={candidate.id} /> : null}
      <Field id={`${p}-last`} label="Nom" name="lastName" defaultValue={candidate?.last_name} errors={errors.lastName} />
      <Field id={`${p}-first`} label="Prénom" name="firstName" defaultValue={candidate?.first_name} errors={errors.firstName} />
      <Field id={`${p}-birth`} label="Date de naissance" name="birthDate" type="date" defaultValue={candidate?.birth_date} errors={errors.birthDate} />
      <Field id={`${p}-email`} label="E-mail" name="email" type="email" defaultValue={candidate?.email ?? ""} errors={errors.email} />
      <div className="grid gap-2">
        <Label htmlFor={`${p}-company`}>Entreprise cliente</Label>
        <NativeSelect id={`${p}-company`} name="clientCompanyId" defaultValue={candidate?.client_company_id ?? ""}>
          <option value="">Aucune (candidat individuel)</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${p}-photo`}>Photo d&apos;identité</Label>
        <Input id={`${p}-photo`} name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="py-2" />
        <FieldErrors errors={errors.photo} />
      </div>
      <fieldset className="grid gap-4 rounded-md border-2 p-4 md:col-span-2 md:grid-cols-2">
        <legend className="px-1 font-bold">Formation suivie</legend>
        <p className="text-muted-foreground md:col-span-2">
          Un testeur ne peut pas évaluer un candidat qu&apos;il a formé : indiquez le formateur pour que le
          logiciel bloque cette affectation.
        </p>
        <div className="grid gap-2">
          <Label htmlFor={`${p}-trainer`}>Formateur parmi vos testeurs</Label>
          <NativeSelect id={`${p}-trainer`} name="trainerTesterId" defaultValue={candidate?.trainer_tester_id ?? ""}>
            <option value="">Aucun de nos testeurs</option>
            {testers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Field id={`${p}-trainer-name`} label="Nom du formateur" name="trainerName" defaultValue={candidate?.trainer_name ?? ""} />
      </fieldset>
      <div className="md:col-span-2">
        <SubmitButton>{candidate ? "Enregistrer" : "Créer le candidat"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CsvImportForm({ sessionId }: { sessionId?: string }) {
  const [state, action] = useActionState(importCandidatesCsv, {});
  return (
    <ActionForm action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      {sessionId ? <input type="hidden" name="sessionId" value={sessionId} /> : null}
      <div className="grid gap-2">
        <Label htmlFor="csv-file">Fichier CSV</Label>
        <Input id="csv-file" name="file" type="file" accept=".csv,text/csv" className="py-2" />
        <FieldErrors errors={state.fieldErrors?.file} />
      </div>
      <p className="text-sm text-muted-foreground">
        Colonnes attendues : <strong>nom</strong>, <strong>prénom</strong>, <strong>date de naissance</strong>{" "}
        (JJ/MM/AAAA), et si besoin entreprise, email, formateur. Séparateur point-virgule ou virgule.
      </p>
      <SubmitButton pendingLabel="Import en cours…">Importer</SubmitButton>
    </ActionForm>
  );
}
