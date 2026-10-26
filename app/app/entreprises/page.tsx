import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientCompany } from "@/lib/types";
import { publicEnv } from "@/lib/env";
import { cancelCompanyInvitation } from "./actions";
import { ClientCompanyForm, CompanyInviteForm } from "./forms";

export const metadata: Metadata = { title: "Entreprises clientes" };

type Row = ClientCompany & { candidates: { count: number }[] };

export default async function ClientCompaniesPage() {
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const [{ data }, { data: invites }, { data: portalUsers }] = await Promise.all([
    supabase
      .from("client_companies")
      .select("id, name, siret, contact_name, contact_email, contact_phone, candidates(count)")
      .order("name"),
    supabase
      .from("company_invitations")
      .select("id, client_company_id, email, full_name, token")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("company_users").select("client_company_id, full_name, email").order("full_name"),
  ]);
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;

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
              <div className="grid gap-3 border-t-2 px-5 py-4">
                <h3 className="font-display text-xl font-bold">Espace entreprise</h3>
                <p className="text-sm text-muted-foreground">
                  Donnez à un contact de cette entreprise l&apos;accès au suivi des CACES® de ses salariés.
                </p>
                {portalUsers?.filter((u) => u.client_company_id === company.id).map((u) => (
                  <p key={u.email} className="text-sm">
                    <strong>{u.full_name}</strong> · {u.email} · compte actif
                  </p>
                ))}
                {invites?.filter((i) => i.client_company_id === company.id).map((i) => (
                  <div key={i.id} className="grid gap-2 rounded-md border-2 p-3">
                    <p className="text-sm">
                      <strong>{i.full_name}</strong> · {i.email} · invitation en attente
                    </p>
                    <input
                      readOnly
                      aria-label={`Lien d'invitation de ${i.full_name}`}
                      className="w-full rounded border bg-muted px-2 py-1 font-mono text-sm"
                      value={`${appUrl}/invitation-entreprise/${i.token}`}
                    />
                    <form action={cancelCompanyInvitation}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="text-sm font-semibold underline">Annuler l&apos;invitation</button>
                    </form>
                  </div>
                ))}
                <CompanyInviteForm companyId={company.id} />
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
