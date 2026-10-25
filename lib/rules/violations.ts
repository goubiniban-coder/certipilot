/**
 * A compliance problem found by a rule. `code` is stable and technical,
 * `message` is the French explanation shown to the user.
 */
export type Severity = "blocking" | "warning";

export interface Violation {
  code: string;
  severity: Severity;
  message: string;
}

export function hasBlocking(violations: readonly Violation[]): boolean {
  return violations.some((v) => v.severity === "blocking");
}
