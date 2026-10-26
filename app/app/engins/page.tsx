import type { Metadata } from "next";
import { ExpiryBadge, formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { getCategoryOptions } from "@/lib/queries/referential";
import { expiryState, inspectionDueDate, toIsoDate } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import type { Equipment } from "@/lib/types";
import { EquipmentForm } from "./forms";

export const metadata: Metadata = { title: "Engins" };

export default async function EquipmentPage() {
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const [{ data }, options] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, category_id, name, brand_model, serial_number, last_inspection_on, active")
      .order("name"),
    getCategoryOptions(),
  ]);
  const today = toIsoDate(new Date());
  const categoryLabel = (id: string) => options.find((o) => o.id === id)?.shortLabel ?? "Catégorie inactive";

  return (
    <>
      <PageHeader guide={["Ajoutez chaque engin utilisé pour les épreuves.", "Indiquez la date de sa dernière vérification périodique.", "Un engin dont la vérification est dépassée ne peut plus servir : une alerte vous prévient avant."]} title="Engins" description="Les engins utilisés pour les épreuves, et la date de leur prochaine vérification." />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          {(data as Equipment[] | null)?.map((equipment) => (
            <details key={equipment.id} className="rounded-lg border-2 bg-card">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4 text-lg">
                <strong>{equipment.name}</strong>
                <span className="text-muted-foreground">
                  n° {equipment.serial_number} · {categoryLabel(equipment.category_id)}
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {!equipment.active ? <Badge variant="secondary">Hors service</Badge> : null}
                  {equipment.last_inspection_on ? (
                    <>
                      <span className="text-base">Vérifié le {formatDate(equipment.last_inspection_on)}</span>
                      <ExpiryBadge
                        state={expiryState(inspectionDueDate(equipment.last_inspection_on), today)}
                        expiredLabel="Vérification de plus d'un an"
                      />
                    </>
                  ) : (
                    <Badge variant="destructive">Jamais vérifié</Badge>
                  )}
                </span>
              </summary>
              <div className="border-t-2 px-5 py-4">
                <EquipmentForm equipment={equipment} options={options} />
              </div>
            </details>
          ))}
        </div>
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Nouvel engin</CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentForm options={options} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
