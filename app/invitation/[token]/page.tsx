import type { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type AppRole } from "@/lib/types";
import { AcceptInvitationForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitation" };

interface InvitationInfo {
  email: string;
  full_name: string;
  role: AppRole;
  organization_name: string;
  valid: boolean;
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  const invitation = (data as InvitationInfo[] | null)?.[0];

  return (
    <div className="min-h-screen bg-muted">
      <header className="px-6 py-5 text-2xl font-bold">{APP_NAME}</header>
      <main className="mx-auto max-w-xl px-4 pb-16">
        {!invitation || !invitation.valid ? (
          <Alert variant="destructive">
            <AlertTitle>Invitation invalide</AlertTitle>
            <AlertDescription>
              Ce lien d&apos;invitation a expiré ou a déjà été utilisé. Demandez une nouvelle
              invitation à votre responsable.{" "}
              <Link href="/connexion" className="font-semibold underline">
                Aller à la connexion
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Rejoindre {invitation.organization_name}</CardTitle>
              <CardDescription>
                {invitation.full_name}, vous êtes invité en tant que{" "}
                <strong>{ROLE_LABELS[invitation.role].toLowerCase()}</strong>. Choisissez votre mot
                de passe pour activer votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AcceptInvitationForm token={token} email={invitation.email} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
