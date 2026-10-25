import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientCompany } from "@/lib/types";
import { ClientCompanyForm } from "./forms";

export const metadata: Metadata = { title: "Entreprises clientes" };

type Row = ClientCompany & { candidates: { count: number }[] };

export default async function ClientCompaniesPage() {
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_companies")
    .select("id, name, siret, contact_name, contact_email, contact_phone, candidates(count)")
    .order("name");

  return (
    <>
      <PageHeader title="Entreprises clientes" description="Les entreprises qui envoient leurs salariés en test." />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          {(data as Row[] | null)?.map((company) => (
            <details key={company.id} className="rounded-lg border-2 bg-card">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-4 text-lg">
                <strong>{company.name}</strong>
                <span className="text-muted-foreground">
                  {company.candidates[0]?.count ?? 0} candidat(s)
                  {company.contact_name ? ` · ${company.contact_name}` : ""}
                </span>
              </summary>
              <div className="border-t-2 px-5 py-4">
                <ClientCompanyForm company={company} />
              </div>
            </details>
          ))}
        </div>
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Nouvelle entreprise</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientCompanyForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
