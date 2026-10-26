import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceAlerts } from "@/components/dashboard/compliance-alerts";
import { CertificateStats, Renewals, UpcomingSessions } from "@/components/dashboard/dashboard-panels";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { getComplianceAlerts } from "@/lib/queries/alerts";
import { getDashboardData } from "@/lib/queries/dashboard";
import { toIsoDate } from "@/lib/rules";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await requireSession(["admin", "secretariat"]);
  const today = toIsoDate(new Date());
  const [alerts, data] = await Promise.all([getComplianceAlerts(today), getDashboardData(today)]);
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`Bienvenue, ${session.profile.full_name}.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/app/candidats/import">Importer des candidats</Link>
            </Button>
            <Button asChild variant="accent">
              <Link href="/app/sessions">
                <Plus aria-hidden="true" />
                Nouvelle session
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6">
        <CertificateStats data={data} />
        <div className="grid gap-6 xl:grid-cols-2">
          <UpcomingSessions sessions={data.upcomingSessions} today={today} />
          <ComplianceAlerts alerts={alerts} />
        </div>
        <Renewals groups={data.renewals} today={today} />
      </div>
    </>
  );
}
