import type { Metadata } from "next";
import { formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { billingTotals, formatEuros, type BillingLine } from "@/lib/billing/totals";
import { createClient } from "@/lib/supabase/server";
import { deleteDraftQuote, invoiceFromQuote, setBillingStatus } from "./actions";
import { BillingForm } from "./forms";

export const metadata: Metadata = { title: "Devis et factures" };

const STATUS: Record<string, { label: string; variant: "outline" | "secondary" | "success" | "warning" | "destructive" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  sent: { label: "Envoyé", variant: "secondary" },
  accepted: { label: "Accepté", variant: "success" },
  paid: { label: "Payée", variant: "success" },
  cancelled: { label: "Annulé", variant: "destructive" },
};

interface Doc {
  id: string;
  kind: "quote" | "invoice";
  number: string;
  title: string;
  issued_on: string;
  status: string;
  vat_rate: number;
  lines: BillingLine[];
  client_companies: { name: string } | null;
}

function StatusButton({ id, status, children }: { id: string; status: string; children: React.ReactNode }) {
  return (
    <form action={setBillingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="outline" size="sm">
        {children}
      </Button>
    </form>
  );
}

export default async function BillingPage() {
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const [{ data: docs, error }, { data: companies }] = await Promise.all([
    supabase
      .from("billing_documents")
      .select("id, kind, number, title, issued_on, status, vat_rate, lines, client_companies(name)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("client_companies").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Devis et factures" description="Vos devis, puis les factures, numérotés sans trou." />
      <div className="grid gap-6 xl:grid-cols-[1fr_28rem]">
        <div className="grid content-start gap-3">
          {error ? (
            <Card>
              <CardContent className="pt-6">
                La facturation n&apos;est pas encore activée sur cette base (migration manquante).
              </CardContent>
            </Card>
          ) : null}
          {!error && !(docs as unknown as Doc[] | null)?.length ? (
            <Card>
              <CardContent className="pt-6">Aucun document pour l&apos;instant. Créez votre premier devis à droite.</CardContent>
            </Card>
          ) : null}
          {(docs as unknown as Doc[] | null)?.map((d) => {
            const totals = billingTotals(d.lines, Number(d.vat_rate));
            const st = STATUS[d.status] ?? { label: d.status, variant: "outline" as const };
            return (
              <div key={d.id} className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">{d.kind === "quote" ? "Devis" : "Facture"}</Badge>
                  <strong className="font-display text-2xl">{d.number}</strong>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <span className="ml-auto font-display text-2xl font-bold">{formatEuros(totals.ttcCents)}</span>
                </div>
                <p>
                  {d.title}
                  <span className="text-muted-foreground">
                    {" "}· {d.client_companies?.name ?? "Particulier"} · {formatDate(d.issued_on)} · {formatEuros(totals.htCents)} HT
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={`/app/facturation/${d.id}/pdf`} download>PDF</a>
                  </Button>
                  {d.status === "draft" ? <StatusButton id={d.id} status="sent">Marquer envoyé</StatusButton> : null}
                  {d.kind === "quote" && d.status === "sent" ? <StatusButton id={d.id} status="accepted">Marquer accepté</StatusButton> : null}
                  {d.kind === "invoice" && d.status === "sent" ? <StatusButton id={d.id} status="paid">Marquer payée</StatusButton> : null}
                  {d.status !== "cancelled" && d.status !== "paid" ? <StatusButton id={d.id} status="cancelled">Annuler</StatusButton> : null}
                  {d.kind === "quote" && (d.status === "accepted" || d.status === "sent") ? (
                    <form action={invoiceFromQuote}>
                      <input type="hidden" name="id" value={d.id} />
                      <Button type="submit" variant="accent" size="sm">Créer la facture</Button>
                    </form>
                  ) : null}
                  {d.kind === "quote" && d.status === "draft" ? (
                    <form action={deleteDraftQuote}>
                      <input type="hidden" name="id" value={d.id} />
                      <Button type="submit" variant="ghost" size="sm">Supprimer</Button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Nouveau document</CardTitle>
          </CardHeader>
          <CardContent>
            <BillingForm companies={(companies as { id: string; name: string }[] | null) ?? []} />
            <p className="mt-4 text-sm text-muted-foreground">
              Complétez l&apos;adresse et le n° de TVA de votre organisme dans « Organisme » : ils figurent sur les PDF.
              Faites valider ces modèles par votre comptable avant un usage officiel.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
