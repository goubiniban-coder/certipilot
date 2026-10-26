import type { Metadata } from "next";
import { ComplianceAlerts } from "@/components/dashboard/compliance-alerts";
import { CertificateStats, Renewals, UpcomingSessions } from "@/components/dashboard/dashboard-panels";
import { ComplianceGauge, NextBestAction } from "@/components/dashboard/smart";
import { GettingStarted, QuickActions, WelcomeBanner, setupSteps } from "@/components/dashboard/welcome";
import { PageHeader } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth";
import { getComplianceAlerts } from "@/lib/queries/alerts";
import { getDashboardData, getSetupProgress } from "@/lib/queries/dashboard";
import { complianceScore, nextAction } from "@/lib/dashboard/next-action";
import { toIsoDate } from "@/lib/rules";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await requireSession(["admin", "secretariat"]);
  const today = toIsoDate(new Date());
  const [alerts, data, setup] = await Promise.all([getComplianceAlerts(today), getDashboardData(today), getSetupProgress()]);
  const in7days = toIsoDate(new Date(Date.now() + 7 * 86_400_000));
  const sessionsSoon = data.upcomingSessions.filter((s) => s.startsOn <= in7days).length;
  const renewals = data.renewals.reduce((n, g) => n + g.certificates.length, 0);
  const expired = alerts.filter((a) => a.state.level === "expired");
  const expiring = alerts.length - expired.length;
  const sessionToday = data.upcomingSessions.find((s) => s.startsOn <= today && s.endsOn >= today) ?? null;
  const action = nextAction({
    expiredAlerts: expired.map((a) => ({ href: a.href, title: a.title })),
    expiringAlerts: expiring,
    sessionToday: sessionToday && { id: sessionToday.id, name: sessionToday.name },
    setupStep: setupSteps(setup).find((st) => !st.done) ?? null,
    renewals,
  });
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
        <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
          <NextBestAction action={action} />
          <ComplianceGauge score={complianceScore(expired.length, expiring)} expired={expired.length} expiring={expiring} />
        </div>
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
