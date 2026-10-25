import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, Grid, Recommendation } from "@/lib/types";
import { createGrid } from "../actions";
import { CategoryForm, RecommendationForm } from "./forms";

export const metadata: Metadata = { title: "Recommandation" };

type CategoryRow = Category & { grids: Pick<Grid, "id" | "version" | "is_active" | "is_example">[] };

export default async function RecommendationPage({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  const session = await requireSession(["admin", "secretariat"]);
  const isAdmin = session.profile.role === "admin";
  const supabase = await createClient();

  const [{ data: recommendation }, { data: categories }] = await Promise.all([
    supabase
      .from("recommendations")
      .select("id, code, label, validity_years, theory_pass_percent, requires_ipr")
      .eq("id", recommendationId)
      .maybeSingle<Recommendation>(),
    supabase
      .from("categories")
      .select("id, recommendation_id, code, label, validity_years, practical_duration_minutes, active, grids(id, version, is_active, is_example)")
      .eq("recommendation_id", recommendationId)
      .order("code"),
  ]);
  if (!recommendation) notFound();

  return (
    <>
      <PageHeader
        title={`${recommendation.code} · ${recommendation.label}`}
        description={
          <Link href="/app/referentiel" className="underline">
            ← Retour au référentiel
          </Link>
        }
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Paramètres de la recommandation</CardTitle>
            <CardDescription>
              Durée de validité par défaut des certificats et seuil de réussite de la théorie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecommendationForm recommendation={recommendation} readOnly={!isAdmin} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catégories</CardTitle>
            <CardDescription>
              Laissez la durée de validité vide pour reprendre celle de la recommandation (
              {recommendation.validity_years} ans).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {(categories as CategoryRow[] | null)?.map((category) => {
              const activeGrid = category.grids.find((g) => g.is_active);
              return (
                <div key={category.id} className="grid gap-3 rounded-lg border-2 p-4">
                  <CategoryForm
                    category={category}
                    recommendationId={recommendation.id}
                    readOnly={!isAdmin}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    {activeGrid ? (
                      <>
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/app/referentiel/grilles/${activeGrid.id}`}>
                            Grille pratique (version {activeGrid.version})
                          </Link>
                        </Button>
                        {activeGrid.is_example ? (
                          <Badge variant="warning">Exemple non officiel, à valider</Badge>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">Aucune grille</Badge>
                        {isAdmin ? (
                          <form action={createGrid}>
                            <input type="hidden" name="categoryId" value={category.id} />
                            <Button type="submit" variant="outline" size="sm">
                              Créer la grille
                            </Button>
                          </form>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {isAdmin ? (
              <div className="rounded-lg border-2 border-dashed p-4">
                <h3 className="mb-3 text-lg font-bold">Ajouter une catégorie</h3>
                <CategoryForm recommendationId={recommendation.id} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
