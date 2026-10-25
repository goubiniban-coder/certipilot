"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { equipmentSchema } from "@/lib/validation/resources";

export async function saveEquipment(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin", "secretariat"]);
  const parsed = equipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, name, brandModel, serialNumber, categoryId, lastInspectionOn, active } = parsed.data;

  const values = {
    name,
    brand_model: brandModel,
    serial_number: serialNumber,
    category_id: categoryId,
    last_inspection_on: lastInspectionOn,
    active,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("equipment").update(values).eq("id", id)
    : await supabase.from("equipment").insert({ ...values, organization_id: session.organization.id });
  if (error) {
    return {
      message:
        error.code === "23505" ? "Un engin porte déjà ce numéro de série." : dbErrorMessage(error),
    };
  }

  revalidatePath("/app/engins");
  return { ok: true, message: id ? "Engin enregistré." : "Engin ajouté." };
}
