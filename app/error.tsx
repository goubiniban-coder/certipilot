"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="grid max-w-md gap-4 text-center" role="alert">
        <h1 className="font-display text-3xl font-bold">Un problème est survenu</h1>
        <p>Rien n&apos;est perdu. Réessayez, et si cela continue, rechargez la page.</p>
        <Button onClick={reset} variant="accent" size="lg" className="justify-self-center">
          Réessayer
        </Button>
      </div>
    </main>
  );
}
