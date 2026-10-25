import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
}

export function Field({ label, name, errors, hint, className, ...props }: FieldProps) {
  const id = props.id ?? name;
  const describedBy = errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && !errors?.length ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <FieldErrors id={`${id}-error`} errors={errors} />
    </div>
  );
}

export function FieldErrors({ id, errors }: { id?: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-sm font-semibold text-destructive">
      {errors.join(" ")}
    </p>
  );
}
