import Link from "next/link";
import { formatDate } from "@/components/expiry-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/queries/dashboard";
import { daysBetween, RENEWAL_HORIZON_MONTHS, type IsoDate } from "@/lib/rules";
import { SESSION_STATUS_LABELS } from "@/lib/types";

export function CertificateStats({ data }: { data: DashboardData }) {
  const stats = [
    { label: "Certificats délivrés ce mois-ci", value: data.issuedThisMonth },
    { label: "Certificats délivrés cette année", value: data.issuedThisYear },
    { label: "Certificats en cours de validité", value: data.validCertificates },
  ];
  return (
    <section aria-label="Certificats délivrés" className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="grid gap-1 pt-6">
            <span className="text-4xl font-bold tabular-nums">{stat.value}</span>
            <span className="text-muted-foreground">{stat.label}</span>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function UpcomingSessions({ sessions, today }: { sessions: DashboardData["upcomingSessions"]; today: IsoDate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prochaines sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-lg">
            Aucune session à venir.{" "}
            <Link href="/app/sessions" className="text-primary underline">
              Planifier une session
            </Link>
          </p>
        ) : (
          <ul className="grid gap-3">
            {sessions.map((s) => {
              const days = daysBetween(today, s.startsOn);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-md border-2 p-3">
                  <div className="grid">
                    <Link href={`/app/sessions/${s.id}`} className="font-semibold text-primary underline">
                      {s.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(s.startsOn)}
                      {s.endsOn !== s.startsOn ? ` au ${formatDate(s.endsOn)}` : ""} · {s.location} · {s.candidates} candidat
                      {s.candidates > 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="ml-auto flex gap-2">
                    {days <= 0 ? <Badge variant="success">En cours</Badge> : <Badge variant="secondary">Dans {days} j</Badge>}
                    <Badge variant="outline">{SESSION_STATUS_LABELS[s.status]}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function Renewals({ groups, today }: { groups: DashboardData["renewals"]; today: IsoDate }) {
  const total = groups.reduce((sum, g) => sum + g.certificates.length, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Renouvellements à prévoir</CardTitle>
        <CardDescription>
          Certificats qui expirent dans les {RENEWAL_HORIZON_MONTHS} prochains mois, par entreprise cliente
          {total ? ` (${total})` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-lg">Aucun certificat n&apos;arrive à échéance dans les {RENEWAL_HORIZON_MONTHS} prochains mois.</p>
        ) : (
          <div className="grid gap-5">
            {groups.map((group) => {
              const company = group.certificates[0]?.clientCompanyName ?? "Candidats individuels";
              return (
                <section key={group.clientCompanyId ?? "none"} aria-label={company} className="grid gap-2">
                  <h3 className="text-lg font-bold">
                    {group.clientCompanyId ? (
                      <Link href={`/app/entreprises`} className="underline">
                        {company}
                      </Link>
                    ) : (
                      company
                    )}{" "}
                    <span className="font-normal text-muted-foreground">· {group.certificates.length} à renouveler</span>
                  </h3>
                  <ul className="grid gap-2">
                    {group.certificates.map((c) => {
                      const days = daysBetween(today, c.expiresOn);
                      return (
                        <li key={c.certificateId} className="flex flex-wrap items-center gap-3 rounded-md bg-muted px-3 py-2">
                          <Link href={`/app/certificats/${c.certificateId}`} className="font-semibold text-primary underline">
                            {c.holderName}
                          </Link>
                          <span>
                            {c.recommendationCode} · {c.number}
                          </span>
                          <Badge variant={days < 60 ? "warning" : "outline"} className="ml-auto">
                            Expire le {formatDate(c.expiresOn)}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
