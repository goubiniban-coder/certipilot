import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession, homeFor } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.profile.role));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Connexion</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <SignInForm />
        <p>
          Nouvel organisme ?{" "}
          <Link href="/inscription" className="font-semibold text-primary underline">
            Inscrire mon organisme
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
