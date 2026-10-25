import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FieldErrors } from "@/components/forms/field";
import type { CategoryOption } from "@/lib/queries/referential";

/** Category picker grouped by recommendation. */
export function CategorySelect({
  id,
  name = "categoryId",
  label = "Catégorie",
  options,
  defaultValue,
  errors,
  disabled,
}: {
  id: string;
  name?: string;
  label?: string;
  options: CategoryOption[];
  defaultValue?: string;
  errors?: string[];
  disabled?: boolean;
}) {
  const groups = new Map<string, CategoryOption[]>();
  for (const option of options) {
    groups.set(option.recommendationCode, [...(groups.get(option.recommendationCode) ?? []), option]);
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={name} defaultValue={defaultValue ?? ""} disabled={disabled} aria-invalid={errors?.length ? true : undefined}>
        <option value="" disabled>
          Choisir une catégorie
        </option>
        {[...groups.entries()].map(([recommendation, list]) => (
          <optgroup key={recommendation} label={recommendation}>
            {list.map((option) => (
              <option key={option.id} value={option.id}>
                {option.shortLabel} · {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </NativeSelect>
      <FieldErrors errors={errors} />
    </div>
  );
}
