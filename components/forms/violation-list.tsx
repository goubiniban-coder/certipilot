import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FormState } from "@/lib/validation/auth";

/** Shows compliance problems: blocking ones first, then warnings. */
export function ViolationList({ violations }: { violations: FormState["violations"] }) {
  if (!violations?.length) return null;
  const blocking = violations.filter((v) => v.severity === "blocking");
  const warnings = violations.filter((v) => v.severity === "warning");
  return (
    <div className="grid gap-3">
      {blocking.length ? (
        <Alert variant="destructive">
          <AlertTitle>Affectation impossible</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {blocking.map((v) => (
                <li key={v.code + v.message}>{v.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {warnings.length ? (
        <Alert variant="warning">
          <AlertTitle>Avertissement</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((v) => (
                <li key={v.code + v.message}>{v.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
