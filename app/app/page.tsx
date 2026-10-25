import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const session = await requireSession(["admin", "secretariat"]);
  return (
    <PageHeader
      title="Tableau de bord"
      description={`Bienvenue, ${session.profile.full_name}.`}
    />
  );
}
