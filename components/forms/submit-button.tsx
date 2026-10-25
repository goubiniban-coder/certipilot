"use client";

import { useFormStatus } from "react-dom";
import { useActionFormPending } from "@/components/forms/action-form";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending: formPending } = useFormStatus();
  const actionFormPending = useActionFormPending();
  const pending = formPending || actionFormPending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
