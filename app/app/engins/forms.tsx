"use client";

import { useActionState } from "react";
import { CategorySelect } from "@/components/forms/category-select";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { CategoryOption } from "@/lib/queries/referential";
import type { Equipment } from "@/lib/types";
import { saveEquipment } from "./actions";

export function EquipmentForm({ equipment, options }: { equipment?: Equipment; options: CategoryOption[] }) {
  const [state, action] = useActionState(saveEquipment, {});
  const errors = state.fieldErrors ?? {};
  const p = equipment?.id ?? "new";
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      {equipment ? <input type="hidden" name="id" value={equipment.id} /> : null}
      <Field id={`${p}-name`} label="Désignation" name="name" defaultValue={equipment?.name} errors={errors.name} />
      <Field id={`${p}-brand`} label="Marque et modèle" name="brandModel" defaultValue={equipment?.brand_model ?? ""} />
      <Field id={`${p}-serial`} label="Numéro de série" name="serialNumber" defaultValue={equipment?.serial_number} errors={errors.serialNumber} />
      <CategorySelect id={`${p}-category`} options={options} defaultValue={equipment?.category_id} errors={errors.categoryId} />
      <Field
        id={`${p}-inspection`}
        label="Dernière vérification périodique"
        name="lastInspectionOn"
        type="date"
        defaultValue={equipment?.last_inspection_on ?? ""}
        errors={errors.lastInspectionOn}
        hint="L'engin ne peut servir à un test que si cette vérification date de moins d'un an."
      />
      {equipment ? (
        <div className="grid gap-2">
          <Label htmlFor={`${p}-active`}>Statut</Label>
          <NativeSelect id={`${p}-active`} name="active" defaultValue={String(equipment.active)}>
            <option value="true">En service</option>
            <option value="false">Hors service</option>
          </NativeSelect>
        </div>
      ) : null}
      <SubmitButton>{equipment ? "Enregistrer" : "Ajouter l'engin"}</SubmitButton>
    </form>
  );
}
