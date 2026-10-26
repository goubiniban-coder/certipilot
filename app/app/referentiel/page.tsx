import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Recommendation } from "@/lib/types";

export const metadata: Metadata = { title: "Référentiel" };

type Row = Recommendation & { categories: { count: number }[] };

export default async function ReferentialPage() {
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("id, code, label, validity_years, theory_pass_percent, requires_ipr, categories(count)")
    .order("code");

  return (
    <>
      <PageHeader guide={["Le référentiel liste les recommandations, catégories et durées de validité.", "Les valeurs viennent des textes officiels : ne les modifiez que si la réglementation change.", "Les grilles d'évaluation se règlent ici, par catégorie."]}
        title="Référentiel"
        description="Recommandations, catégories, durées de validité et grilles de votre organisme."
      />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recommandation</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Théorie</TableHead>
                <TableHead>Catégories</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as Row[] | null)?.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>
                    <Link href={`/app/referentiel/${rec.id}`} className="font-semibold text-primary underline">
                      {rec.code}
                    </Link>
                    <div>{rec.label}</div>
                  </TableCell>
                  <TableCell>{rec.validity_years} ans</TableCell>
                  <TableCell>
                    QCM ≥ {Number(rec.theory_pass_percent)} %
                    {rec.requires_ipr ? (
                      <Badge variant="secondary" className="ml-2">
                        + QCM-IPR
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{rec.categories[0]?.count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
