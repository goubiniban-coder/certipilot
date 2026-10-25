import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { CsvImportForm } from "../forms";

export const metadata: Metadata = { title: "Importer des candidats" };

export default async function ImportPage() {
  await requireSession(["admin", "secretariat"]);
  return (
    <>
      <PageHeader
        title="Importer des candidats"
        description={
          <Link href="/app/candidats" className="underline">
            ← Tous les candidats
          </Link>
        }
      />
      <Card className="max-w-2xl">
        <CardContent>
          <CsvImportForm />
        </CardContent>
      </Card>
    </>
  );
}
