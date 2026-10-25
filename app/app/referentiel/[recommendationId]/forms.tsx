"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Category, Recommendation } from "@/lib/types";
import { saveCategory, updateRecommendation } from "../actions";

export function RecommendationForm({
  recommendation,
  readOnly,
}: {
  recommendation: Recommendation;
  readOnly: boolean;
}) {
  const [state, action] = useActionState(updateRecommendation, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-5 md:grid-cols-2" noValidate>
      <div className="md:col-span-2">
        <FormMessage state={state} />
      </div>
      <input type="hidden" name="id" value={recommendation.id} />
      <Field label="Libellé" name="label" defaultValue={recommendation.label} disabled={readOnly} errors={errors.label} className="md:col-span-2" />
      <Field
        label="Durée de validité (années)"
        name="validityYears"
        type="number"
        min={1}
        max={20}
        defaultValue={recommendation.validity_years}
        disabled={readOnly}
        errors={errors.validityYears}
      />
      <Field
        label="Seuil de réussite théorique (%)"
        name="theoryPassPercent"
        type="number"
        min={0}
        max={100}
        step="0.5"
        defaultValue={Number(recommendation.theory_pass_percent)}
        disabled={readOnly}
        errors={errors.theoryPassPercent}
      />
      <div className="flex items-center gap-3 md:col-span-2">
        <Checkbox id="requiresIpr" name="requiresIpr" defaultChecked={recommendation.requires_ipr} disabled={readOnly} />
        <Label htmlFor="requiresIpr">QCM-IPR obligatoire en plus du QCM</Label>
      </div>
      {readOnly ? null : (
        <div className="md:col-span-2">
          <SubmitButton>Enregistrer</SubmitButton>
        </div>
      )}
    </form>
  );
}

export function CategoryForm({
  category,
  recommendationId,
  readOnly = false,
}: {
  category?: Category;
  recommendationId: string;
  readOnly?: boolean;
}) {
  const [state, action] = useActionState(saveCategory, {});
  const errors = state.fieldErrors ?? {};
  const prefix = category?.id ?? "new";
  return (
    <form action={action} className="grid gap-4 md:grid-cols-[6rem_1fr_10rem_10rem]" noValidate>
      {state.message ? (
        <div className="md:col-span-4">
          <FormMessage state={state} />
        </div>
      ) : null}
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <Field id={`${prefix}-code`} label="Code" name="code" defaultValue={category?.code} disabled={readOnly} errors={errors.code} />
      <Field id={`${prefix}-label`} label="Libellé" name="label" defaultValue={category?.label} disabled={readOnly} errors={errors.label} />
      <Field
        id={`${prefix}-validity`}
        label="Validité (ans)"
        name="validityYears"
        type="number"
        min={1}
        max={20}
        defaultValue={category?.validity_years ?? ""}
        disabled={readOnly}
        errors={errors.validityYears}
      />
      <Field
        id={`${prefix}-duration`}
        label="Durée du test (min)"
        name="practicalDurationMinutes"
        type="number"
        min={1}
        defaultValue={category?.practical_duration_minutes ?? ""}
        disabled={readOnly}
        errors={errors.practicalDurationMinutes}
      />
      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-4 md:col-span-4">
          {category ? (
            <div className="flex items-center gap-3">
              <Checkbox id={`${prefix}-active`} name="active" defaultChecked={category.active} />
              <Label htmlFor={`${prefix}-active`}>Catégorie proposée</Label>
            </div>
          ) : null}
          <SubmitButton size="sm" variant={category ? "outline" : "default"}>
            {category ? "Enregistrer" : "Ajouter la catégorie"}
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
