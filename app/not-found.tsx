import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="grid max-w-md gap-4 text-center">
        <p className="font-display text-7xl font-bold text-[var(--marine)]">404</p>
        <h1 className="font-display text-3xl font-bold">Cette page n&apos;existe pas</h1>
        <p>Le lien est peut-être ancien ou mal recopié.</p>
        <Button asChild variant="accent" size="lg" className="justify-self-center">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </main>
  );
}
