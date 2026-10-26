import type { Metadata } from "next";
import Link from "next/link";
import { ExpiryBadge, formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { expiryState, toIsoDate } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import type { Tester, TesterPersonalCaces, TesterQualification } from "@/lib/types";
import { TesterForm } from "./forms";

export const metadata: Metadata = { title: "Testeurs" };

type Row = Tester & {
  tester_qualifications: Pick<TesterQualification, "id" | "active">[];
  tester_personal_caces: Pick<TesterPersonalCaces, "id" | "expires_on">[];
};

export default async function TestersPage() {
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("testers")
    .select("id, profile_id, full_name, email, active, tester_qualifications(id, active), tester_personal_caces(id, expires_on)")
    .order("full_name");
  const today = toIsoDate(new Date());

  return (
    <>
      <PageHeader guide={["Ajoutez les testeurs et indiquez leurs habilitations par catégorie.", "Un testeur sans habilitation valide ne peut pas être affecté à une épreuve.", "Pensez à renouveler leur CACES® personnel : une alerte vous prévient avant l'échéance."]} title="Testeurs" description="Les personnes qui font passer les épreuves, avec leurs habilitations et leurs CACES® personnels." />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Testeur</TableHead>
                  <TableHead>Habilitations</TableHead>
                  <TableHead>CACES® personnel le plus proche de l&apos;échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as Row[] | null)?.map((tester) => {
                  const nextExpiry = tester.tester_personal_caces
                    .map((c) => c.expires_on)
                    .sort()[0];
                  return (
                    <TableRow key={tester.id}>
                      <TableCell>
                        <Link href={`/app/testeurs/${tester.id}`} className="font-semibold text-primary underline">
                          {tester.full_name}
                        </Link>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {!tester.active ? <Badge variant="secondary">Inactif</Badge> : null}
                          {!tester.profile_id ? <Badge variant="outline">Sans compte</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>{tester.tester_qualifications.filter((q) => q.active).length}</TableCell>
                      <TableCell>
                        {nextExpiry ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {formatDate(nextExpiry)}
                            <ExpiryBadge state={expiryState(nextExpiry, today, { inclusive: true })} />
                          </div>
                        ) : (
                          <Badge variant="destructive">Aucun CACES® enregistré</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Nouveau testeur</CardTitle>
          </CardHeader>
          <CardContent>
            <TesterForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
