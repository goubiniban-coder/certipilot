import Link from "next/link";
import { ExpiryBadge, formatDate } from "@/components/expiry-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceAlert } from "@/lib/queries/alerts";

export function ComplianceAlerts({ alerts }: { alerts: ComplianceAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes de conformité</CardTitle>
        <CardDescription>
          CACES® des testeurs et vérifications d&apos;engins expirés ou qui expirent dans moins de 60 jours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-lg">Aucune alerte : tout est à jour.</p>
        ) : (
          <ul className="grid gap-3">
            {alerts.map((alert) => (
              <li key={`${alert.kind}-${alert.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-orange-50 p-3">
                <div className="grid">
                  <Link href={alert.href} className="font-semibold text-primary underline">
                    {alert.title}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {alert.detail} · échéance {formatDate(alert.dueOn)}
                  </span>
                </div>
                <span className="ml-auto">
                  <ExpiryBadge state={alert.state} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
