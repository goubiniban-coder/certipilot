import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GdprPurgeForm, OrganizationForm } from "./forms";

export const metadata: Metadata = { title: "Organisme" };

export default async function OrganizationPage() {
  const session = await requireSession(["admin"]);
  // Billing details are read apart: they only exist once the billing migration is applied.
  const { data: billing } = await (await createClient())
    .from("organizations")
    .select("address, vat_number")
    .eq("id", session.organization.id)
    .maybeSingle();
  const organization = { ...session.organization, ...(billing ?? {}) };
  return (
    <>
      <PageHeader title="Organisme" description="Paramètres de votre organisme testeur." />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationForm organization={organization} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>RGPD</CardTitle>
            <CardDescription>
              Remplace l&apos;identité, la date de naissance, la photo et le numéro de pièce
              d&apos;identité des candidats dont la durée de conservation est dépassée. Les
              certificats émis restent consultables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GdprPurgeForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
