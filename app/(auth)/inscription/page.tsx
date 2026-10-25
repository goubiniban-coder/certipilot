import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Inscrire mon organisme" };

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Inscrire mon organisme</CardTitle>
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
