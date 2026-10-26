import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Candidate } from "@/lib/types";
import { CandidateForm } from "./forms";

export const metadata: Metadata = { title: "Candidats" };

type Row = Candidate & { client_companies: { name: string } | null };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSession(["admin", "secretariat"]);
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("candidates")
    .select("id, last_name, first_name, birth_date, email, photo_path, client_company_id, trainer_tester_id, trainer_name, anonymized_at, client_companies(name)")
    .is("anonymized_at", null)
    .order("last_name")
    .limit(200);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`last_name.ilike.%${term}%,first_name.ilike.%${term}%`);
  const [{ data }, { data: companies }, { data: testers }] = await Promise.all([
    query,
    supabase.from("client_companies").select("id, name").order("name"),
    supabase.from("testers").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  return (
    <>
      <PageHeader guide={["Ajoutez les candidats un par un, ou importez-les d'un coup depuis un fichier.", "Rattachez chaque candidat à son entreprise : elle pourra suivre ses résultats.", "Inscrivez-les ensuite à une session de test."]}
        title="Candidats"
        actions={
          <Button asChild variant="outline">
            <Link href="/app/candidats/import">Importer un fichier CSV</Link>
          </Button>
        }
      />
      <div className="grid gap-6 2xl:grid-cols-[1fr_36rem]">
        <Card className="content-start">
          <CardContent className="grid gap-4">
            <form className="flex gap-3" role="search">
              <Input name="q" defaultValue={q} placeholder="Rechercher par nom" aria-label="Rechercher un candidat" />
              <Button type="submit" variant="secondary">
                Rechercher
              </Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Naissance</TableHead>
                  <TableHead>Entreprise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as Row[] | null)?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/app/candidats/${c.id}`} className="font-semibold text-primary underline">
                        {c.last_name.toUpperCase()} {c.first_name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(c.birth_date)}</TableCell>
                    <TableCell>{c.client_companies?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Nouveau candidat</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateForm
              companies={(companies ?? []).map((c) => ({ id: c.id, name: c.name }))}
              testers={(testers ?? []).map((t) => ({ id: t.id, name: t.full_name }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
