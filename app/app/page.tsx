import type { Metadata } from "next";
import { ComplianceAlerts } from "@/components/dashboard/compliance-alerts";
import { PageHeader } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth";
import { getComplianceAlerts } from "@/lib/queries/alerts";
import { toIsoDate } from "@/lib/rules";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await requireSession(["admin", "secretariat"]);
  const alerts = await getComplianceAlerts(toIsoDate(new Date()));
  return (
    <>
      <PageHeader title="Tableau de bord" description={`Bienvenue, ${session.profile.full_name}.`} />
      <div className="grid gap-6">
        <ComplianceAlerts alerts={alerts} />
      </div>
    </>
  );
}
