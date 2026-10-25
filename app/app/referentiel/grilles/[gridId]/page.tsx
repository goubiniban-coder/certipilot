import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Grid, GridItem } from "@/lib/types";
import { newGridVersion } from "../../actions";
import { GridEditor } from "./grid-editor";

export const metadata: Metadata = { title: "Grille pratique" };

type GridRow = Grid & {
  categories: { id: string; code: string; label: string; recommendation_id: string; recommendations: { code: string } };
};

export default async function GridPage({ params }: { params: Promise<{ gridId: string }> }) {
  const { gridId } = await params;
  const session = await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();

  const [{ data: grid }, { data: items }, { count: usage }] = await Promise.all([
    supabase
      .from("grids")
      .select("id, category_id, name, version, is_active, is_example, pass_score, notes, categories(id, code, label, recommendation_id, recommendations(code))")
      .eq("id", gridId)
      .maybeSingle<GridRow>(),
    supabase
      .from("grid_items")
      .select("id, grid_id, position, label, description, max_points, eliminatory")
      .eq("grid_id", gridId)
      .order("position"),
    supabase.from("practical_tests").select("id", { count: "exact", head: true }).eq("grid_id", gridId),
  ]);
  if (!grid) notFound();

  const inUse = (usage ?? 0) > 0;
  const editable = session.profile.role === "admin" && !inUse && grid.is_active;
  const category = grid.categories;

  return (
    <>
      <PageHeader
        title={`Grille ${category.recommendations.code} catégorie ${category.code}`}
        description={
          <Link href={`/app/referentiel/${category.recommendation_id}`} className="underline">
            ← {category.label}
          </Link>
        }
        actions={
          <>
            <Badge variant="outline">Version {grid.version}</Badge>
            {grid.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Archivée</Badge>}
          </>
        }
      />
      <div className="grid max-w-5xl gap-6">
        {grid.is_example ? (
          <Alert variant="warning">
            <AlertTitle>Grille d&apos;exemple, non officielle</AlertTitle>
            <AlertDescription>
              Les critères et les points sont des propositions à valider avec un testeur avant toute
              utilisation réelle.
            </AlertDescription>
          </Alert>
        ) : null}
        {inUse && session.profile.role === "admin" && grid.is_active ? (
          <Alert>
            <AlertTitle>Grille déjà utilisée</AlertTitle>
            <AlertDescription className="grid gap-3">
              <span>
                Cette grille a servi à {usage} épreuve(s) : elle ne peut plus être modifiée. Créez
                une nouvelle version ; les épreuves passées gardent l&apos;ancienne.
              </span>
              <form action={newGridVersion}>
                <input type="hidden" name="gridId" value={grid.id} />
                <Button type="submit">Créer une nouvelle version</Button>
              </form>
            </AlertDescription>
          </Alert>
        ) : null}
        <GridEditor
          gridId={grid.id}
          name={grid.name}
          passScore={Number(grid.pass_score)}
          items={(items as GridItem[] | null) ?? []}
          editable={editable}
        />
      </div>
    </>
  );
}
