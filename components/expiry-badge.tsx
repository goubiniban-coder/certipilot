import { Badge } from "@/components/ui/badge";
import type { ExpiryState } from "@/lib/rules";

export const dateFr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

/** Formats an ISO calendar date (YYYY-MM-DD) for display. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFr.format(new Date(`${iso}T00:00:00Z`)) : "—";
}

export function ExpiryBadge({ state, expiredLabel = "Expiré" }: { state: ExpiryState; expiredLabel?: string }) {
  if (state.level === "expired") return <Badge variant="destructive">{expiredLabel}</Badge>;
  if (state.level === "expiring")
    return <Badge variant="warning">Expire dans {state.daysLeft} jour{state.daysLeft > 1 ? "s" : ""}</Badge>;
  return <Badge variant="success">Valide</Badge>;
}
