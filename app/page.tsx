import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold">{APP_NAME}</h1>
        <p className="text-xl text-muted-foreground">{APP_DESCRIPTION}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Button asChild size="lg">
          <Link href="/connexion">Se connecter</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/inscription">Inscrire mon organisme</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        CACES® est une marque déposée de la Cnam. {APP_NAME} n&apos;est ni
        affilié à la Cnam ni approuvé par elle.
      </p>
    </main>
  );
}
