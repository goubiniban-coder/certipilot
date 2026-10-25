import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Application testeur" };

export default async function TesterHomePage() {
  const session = await requireSession(["tester", "admin"]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Bonjour {session.profile.full_name}</h1>
    </main>
  );
}
