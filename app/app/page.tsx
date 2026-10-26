import type { Metadata } from "next";
import { ComplianceAlerts } from "@/components/dashboard/compliance-alerts";
import { CertificateStats, Renewals, UpcomingSessions } from "@/components/dashboard/dashboard-panels";
import { GettingStarted, QuickActions, WelcomeBanner } from "@/components/dashboard/welcome";
import { PageHeader } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth";
import { getComplianceAlerts } from "@/lib/queries/alerts";
import { getDashboardData, getSetupProgress } from "@/lib/queries/dashboard";
import { toIsoDate } from "@/lib/rules";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await requireSession(["admin", "secretariat"]);
  const today = toIsoDate(new Date());
  const [alerts, data, setup] = await Promise.all([getComplianceAlerts(today), getDashboardData(today), getSetupProgress()]);
  const in7days = toIsoDate(new Date(Date.now() + 7 * 86_400_000));
  const sessionsSoon = data.upcomingSessions.filter((s) => s.startsOn <= in7days).length;
  const renewals = data.renewals.reduce((n, g) => n + g.certificates.length, 0);
  return (
    <>
      <PageHeader title="Tableau de bord" />
      <div className="grid gap-6">
        <WelcomeBanner
          name={session.profile.full_name}
          organization={session.organization.name}
          sessionsSoon={sessionsSoon}
          alerts={alerts.length}
          renewals={renewals}
        />
        <QuickActions />
        <GettingStarted progress={setup} />
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
