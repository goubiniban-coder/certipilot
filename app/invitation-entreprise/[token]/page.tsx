import type { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { AcceptCompanyInvitationForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitation entreprise", robots: { index: false, follow: false } };

interface Info {
  email: string;
  full_name: string;
  company_name: string;
  organization_name: string;
  valid: boolean;
}

export default async function CompanyInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_company_invitation", { p_token: token });
  const invitation = (data as Info[] | null)?.[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[var(--marine)] px-6 py-4 font-display text-2xl font-bold text-white">{APP_NAME}</header>
      <main className="mx-auto max-w-xl px-4 py-10">
        {!invitation || !invitation.valid ? (
          <Alert variant="destructive">
            <AlertTitle>Invitation invalide</AlertTitle>
            <AlertDescription>
              Ce lien a expiré ou a déjà été utilisé. Demandez une nouvelle invitation à votre organisme testeur.{" "}
              <Link href="/connexion" className="font-semibold underline">
                Aller à la connexion
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <h1 className="font-display text-3xl font-bold leading-tight">Espace {invitation.company_name}</h1>
              <CardDescription>
                {invitation.full_name}, {invitation.organization_name} vous donne accès au suivi des CACES® de vos
                salariés. Choisissez votre mot de passe pour activer votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptCompanyInvitationForm token={token} email={invitation.email} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
