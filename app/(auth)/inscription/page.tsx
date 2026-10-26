import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Inscrire mon organisme" };

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <h1 className="font-display text-3xl font-bold leading-tight">Inscrire mon organisme</h1>
        <CardDescription>
          Vous créez l&apos;espace de votre organisme testeur et en devenez le responsable. Vous
          pourrez ensuite inviter le secrétariat et les testeurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <SignUpForm />
        <p>
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-semibold text-primary underline">
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
