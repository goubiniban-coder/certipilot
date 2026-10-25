import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "@/lib/validation/auth";

export function FormMessage({ state }: { state: FormState | undefined }) {
  if (!state?.message) return null;
  return (
    <Alert variant={state.ok ? "success" : "destructive"}>
      <AlertDescription className="text-inherit">{state.message}</AlertDescription>
    </Alert>
  );
}
