"use client";

import { ActionForm } from "@/components/forms/action-form";
import { useActionState, useState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { ViolationList } from "@/components/forms/violation-list";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SESSION_STATUS_LABELS, type SessionStatus, type TestSession } from "@/lib/types";
import {
  addPracticalTest,
  addSessionCandidate,
  addSessionEquipment,
  addSessionTester,
  saveSession,
  saveTheoryResult,
} from "./actions";

export function SessionForm({ session }: { session?: TestSession }) {
  const [state, action] = useActionState(saveSession, {});
  const errors = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="grid gap-4 md:grid-cols-2" noValidate>
      <div className="md:col-span-2">
        <FormMessage state={state} />
      </div>
      {session ? <input type="hidden" name="id" value={session.id} /> : null}
      <Field label="Nom de la session" name="name" defaultValue={session?.name} errors={errors.name} className="md:col-span-2" />
      <Field label="Date de début" name="startsOn" type="date" defaultValue={session?.starts_on} errors={errors.startsOn} />
      <Field label="Date de fin" name="endsOn" type="date" defaultValue={session?.ends_on} errors={errors.endsOn} />
      <Field label="Lieu" name="location" defaultValue={session?.location} errors={errors.location} />
      <div className="grid gap-2">
        <Label htmlFor="status">Statut</Label>
        <NativeSelect id="status" name="status" defaultValue={session?.status ?? "planned"}>
          {(Object.entries(SESSION_STATUS_LABELS) as [SessionStatus, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="md:col-span-2">
        <SubmitButton>{session ? "Enregistrer" : "Créer la session"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

interface Option {
  id: string;
  label: string;
}

function SimpleAddForm({
  action: serverAction,
  sessionId,
  name,
  label,
  options,
  submitLabel,
}: {
  action: typeof addSessionTester;
  sessionId: string;
  name: string;
  label: string;
  options: Option[];
  submitLabel: string;
}) {
  const [state, action] = useActionState(serverAction, {});
  return (
    <ActionForm action={action} className="grid gap-3" noValidate>
      {state.ok ? null : <FormMessage state={state} />}
      <ViolationList violations={state.violations} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-2">
          <Label htmlFor={`${name}-${sessionId}`}>{label}</Label>
          <NativeSelect id={`${name}-${sessionId}`} name={name} defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <SubmitButton variant="outline" pendingLabel="Ajout…">
          {submitLabel}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AddTesterForm(props: { sessionId: string; options: Option[] }) {
  return <SimpleAddForm action={addSessionTester} name="testerId" label="Testeur" submitLabel="Affecter" {...props} />;
}

export function AddEquipmentForm(props: { sessionId: string; options: Option[] }) {
  return <SimpleAddForm action={addSessionEquipment} name="equipmentId" label="Engin" submitLabel="Affecter" {...props} />;
}

export function AddCandidateForm(props: { sessionId: string; options: Option[] }) {
  return <SimpleAddForm action={addSessionCandidate} name="candidateId" label="Candidat existant" submitLabel="Inscrire" {...props} />;
}

export interface CategoryChoice extends Option {
  equipment: Option[];
}

export function PracticalTestForm({
  sessionId,
  sessionCandidateId,
  categories,
  testers,
  dates,
}: {
  sessionId: string;
  sessionCandidateId: string;
  categories: CategoryChoice[];
  testers: Option[];
  dates: string[];
}) {
  const [state, action] = useActionState(addPracticalTest, {});
  const [categoryId, setCategoryId] = useState("");
  const equipment = categories.find((c) => c.id === categoryId)?.equipment ?? [];
  const hasWarnings = state.violations?.some((v) => v.severity === "warning") && !state.violations.some((v) => v.severity === "blocking");
  const p = `pt-${sessionCandidateId}`;
  return (
    <ActionForm action={action} className="grid gap-3" noValidate>
      <FormMessage state={state} />
      <ViolationList violations={state.violations} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sessionCandidateId" value={sessionCandidateId} />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor={`${p}-category`}>Catégorie</Label>
          <NativeSelect id={`${p}-category`} name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="" disabled>
              Choisir
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${p}-tester`}>Testeur</Label>
          <NativeSelect id={`${p}-tester`} name="testerId" defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            {testers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${p}-equipment`}>Engin</Label>
          <NativeSelect id={`${p}-equipment`} name="equipmentId" defaultValue="" key={categoryId}>
            <option value="" disabled>
              {categoryId ? (equipment.length ? "Choisir" : "Aucun engin de cette catégorie") : "Choisir d'abord la catégorie"}
            </option>
            {equipment.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${p}-date`}>Date du test</Label>
          <NativeSelect id={`${p}-date`} name="testDate" defaultValue={dates[0]}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {new Date(`${d}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {hasWarnings ? (
        <div className="flex items-center gap-3">
          <Checkbox id={`${p}-confirm`} name="confirmWarnings" />
          <Label htmlFor={`${p}-confirm`}>J&apos;ai vérifié et je confirme l&apos;affectation</Label>
        </div>
      ) : null}
      <div>
        <SubmitButton variant="secondary" pendingLabel="Vérification…">
          Planifier l&apos;épreuve pratique
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function TheoryForm({
  sessionId,
  sessionCandidateId,
  recommendations,
  defaultDate,
}: {
  sessionId: string;
  sessionCandidateId: string;
  recommendations: (Option & { requiresIpr: boolean })[];
  defaultDate: string;
}) {
  const [state, action] = useActionState(saveTheoryResult, {});
  const errors = state.fieldErrors ?? {};
  const p = `th-${sessionCandidateId}`;
  return (
    <ActionForm action={action} className="grid gap-3" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sessionCandidateId" value={sessionCandidateId} />
      <input type="hidden" name="takenOn" value={defaultDate} />
      <div className="grid gap-3 md:grid-cols-[1fr_10rem_7rem_7rem_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor={`${p}-rec`}>Recommandation</Label>
          <NativeSelect id={`${p}-rec`} name="recommendationId" defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            {recommendations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${p}-kind`}>Épreuve</Label>
          <NativeSelect id={`${p}-kind`} name="kind" defaultValue="qcm">
            <option value="qcm">QCM</option>
            <option value="qcm_ipr">QCM-IPR (R.482)</option>
          </NativeSelect>
        </div>
        <Field id={`${p}-score`} label="Score" name="score" type="number" min={0} step="0.5" errors={errors.score} />
        <Field id={`${p}-max`} label="Sur" name="maxScore" type="number" min={1} defaultValue={40} errors={errors.maxScore} />
        <SubmitButton variant="secondary">Enregistrer</SubmitButton>
      </div>
    </ActionForm>
  );
}
