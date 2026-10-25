import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpiryBadge, formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { getCategoryOptions } from "@/lib/queries/referential";
import { expiryState, toIsoDate } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import type { Tester, TesterPersonalCaces, TesterQualification } from "@/lib/types";
import { deletePersonalCaces, toggleQualification } from "../actions";
import { PersonalCacesForm, QualificationForm, TesterForm } from "../forms";

export const metadata: Metadata = { title: "Fiche testeur" };

export default async function TesterPage({ params }: { params: Promise<{ testerId: string }> }) {
  const { testerId } = await params;
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const [{ data: tester }, { data: qualifications }, { data: caces }, options] = await Promise.all([
    supabase.from("testers").select("id, profile_id, full_name, email, active").eq("id", testerId).maybeSingle<Tester>(),
    supabase.from("tester_qualifications").select("id, tester_id, category_id, granted_on, active").eq("tester_id", testerId),
    supabase
      .from("tester_personal_caces")
      .select("id, tester_id, category_id, certificate_number, issuer_name, issuer_siret, expires_on")
      .eq("tester_id", testerId)
      .order("expires_on"),
    getCategoryOptions(),
  ]);
  if (!tester) notFound();

  const today = toIsoDate(new Date());
  const categoryLabel = (id: string) => options.find((o) => o.id === id)?.shortLabel ?? "Catégorie inactive";

  return (
    <>
      <PageHeader
        title={tester.full_name}
        description={
          <Link href="/app/testeurs" className="underline">
            ← Tous les testeurs
          </Link>
        }
        actions={!tester.profile_id ? <Badge variant="outline">Sans compte : invitez-le depuis Utilisateurs</Badge> : null}
      />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent>
            <TesterForm tester={tester} />
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Habilitations par l&apos;organisme</CardTitle>
              <CardDescription>Catégories que ce testeur est autorisé à évaluer.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ul className="grid gap-2">
                {(qualifications as TesterQualification[] | null)?.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-md border-2 p-3">
                    <strong>{categoryLabel(q.category_id)}</strong>
                    <span className="text-muted-foreground">depuis le {formatDate(q.granted_on)}</span>
                    {q.active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Suspendue</Badge>}
                    <form action={toggleQualification} className="ml-auto">
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="testerId" value={tester.id} />
                      <input type="hidden" name="active" value={String(!q.active)} />
                      <Button type="submit" variant="outline" size="sm">
                        {q.active ? "Suspendre" : "Réactiver"}
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
              <QualificationForm testerId={tester.id} options={options} today={today} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CACES® personnels</CardTitle>
              <CardDescription>
                Délivrés par un autre organisme testeur. Un testeur ne peut évaluer une catégorie que
                s&apos;il détient un CACES® valide pour celle-ci à la date du test.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Numéro et émetteur</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(caces as TesterPersonalCaces[] | null)?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold">{categoryLabel(c.category_id)}</TableCell>
                      <TableCell>
                        {c.certificate_number}
                        <div className="text-sm text-muted-foreground">
                          {c.issuer_name} · SIRET {c.issuer_siret}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {formatDate(c.expires_on)}
                          <ExpiryBadge state={expiryState(c.expires_on, today, { inclusive: true })} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <form action={deletePersonalCaces}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="testerId" value={tester.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Supprimer
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PersonalCacesForm testerId={tester.id} options={options} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
