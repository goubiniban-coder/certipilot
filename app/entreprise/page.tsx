import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { formatDate } from "@/components/expiry-badge";
import { FamilyPicto } from "@/components/brand/family-picto";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCompanySession } from "@/lib/auth";
import { expiryState, toIsoDate } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Espace entreprise", robots: { index: false, follow: false } };

interface Row {
  number: string;
  holder_name: string;
  recommendation_code: string;
  recommendation_label: string;
  issued_on: string;
  expires_on: string;
  status: "valid" | "expired" | "revoked";
  verification_token: string;
}

export default async function CompanyPortalPage() {
  const session = await requireCompanySession();
  const supabase = await createClient();
  const { data } = await supabase.rpc("company_portal_certificates");
  const rows = (data as Row[] | null) ?? [];
  const today = toIsoDate(new Date());

  const states = rows.map((r) => ({ row: r, state: expiryState(r.expires_on, today, { alertDays: 180, inclusive: true }) }));
  const valid = states.filter((s) => s.row.status === "valid" && s.state.level === "ok").length;
  const toRenew = states.filter((s) => s.row.status === "valid" && s.state.level === "expiring").length;
  const lapsed = states.filter((s) => s.row.status !== "valid").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-3 bg-[var(--marine)] px-5 py-4 text-white">
        <Logo size={36} />
        <div className="mr-auto">
          <p className="font-display text-2xl font-bold leading-none">{session.companyName}</p>
          <p className="text-sm text-white/70">Espace entreprise · {session.organizationName}</p>
        </div>
        <form action="/auth/deconnexion" method="post">
          <Button type="submit" variant="outline" size="sm" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <LogOut aria-hidden /> Se déconnecter
          </Button>
        </form>
      </header>
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Vos salariés habilités</h1>
          <p className="text-muted-foreground">Les CACES® délivrés par {session.organizationName} à vos salariés.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["En cours de validité", valid, "text-success"],
            ["À renouveler sous 6 mois", toRenew, "text-warning-foreground"],
            ["Expirés ou révoqués", lapsed, "text-destructive"],
          ].map(([label, n, tone]) => (
            <Card key={label as string}>
              <CardContent className="pt-6">
                <p className={`font-display text-5xl font-bold ${tone}`}>{n as number}</p>
                <p className="font-semibold">{label as string}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {rows.length === 0 ? (
          <Card>
            <CardContent className="pt-6">Aucun certificat n&apos;a encore été délivré à vos salariés.</CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {states.map(({ row, state }) => (
              <li key={row.number} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs">
                <FamilyPicto code={row.recommendation_code} size={48} />
                <div className="mr-auto min-w-48">
                  <p className="font-display text-2xl font-bold leading-tight">{row.holder_name}</p>
                  <p className="text-muted-foreground">
                    {row.recommendation_code} · {row.recommendation_label} · n° {row.number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valable jusqu&apos;au</p>
                  <p className="font-semibold">{formatDate(row.expires_on)}</p>
                </div>
                {row.status === "revoked" ? (
                  <Badge variant="destructive">Révoqué</Badge>
                ) : row.status === "expired" ? (
                  <Badge variant="destructive">Expiré</Badge>
                ) : state.level === "expiring" ? (
                  <Badge variant="warning">À renouveler ({state.daysLeft} j)</Badge>
                ) : (
                  <Badge variant="success">Valide</Badge>
                )}
                <Link href={`/verifier/${row.verification_token}`} className="font-semibold text-primary underline">
                  Vérifier
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
