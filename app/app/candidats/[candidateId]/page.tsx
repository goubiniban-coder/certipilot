import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Candidate } from "@/lib/types";
import { CandidateForm } from "../forms";

export const metadata: Metadata = { title: "Fiche candidat" };

export default async function CandidatePage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const [{ data: candidate }, { data: companies }, { data: testers }] = await Promise.all([
    supabase
      .from("candidates")
      .select("id, last_name, first_name, birth_date, email, photo_path, client_company_id, trainer_tester_id, trainer_name, anonymized_at")
      .eq("id", candidateId)
      .maybeSingle<Candidate>(),
    supabase.from("client_companies").select("id, name").order("name"),
    supabase.from("testers").select("id, full_name").order("full_name"),
  ]);
  if (!candidate) notFound();
  const photo = await signedUrl("candidate-photos", candidate.photo_path);

  return (
    <>
      <PageHeader
        title={`${candidate.last_name.toUpperCase()} ${candidate.first_name}`}
        description={
          <Link href="/app/candidats" className="underline">
            ← Tous les candidats
          </Link>
        }
      />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[14rem_1fr]">
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Photo</CardTitle>
          </CardHeader>
          <CardContent>
            {photo ? (
              // Signed URL valid for a few minutes: next/image would cache it.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={`Photo de ${candidate.first_name} ${candidate.last_name}`} className="w-full rounded-md border-2" />
            ) : (
              <p className="text-muted-foreground">Aucune photo. Elle est obligatoire pour délivrer le certificat.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateForm
              candidate={candidate}
              companies={(companies ?? []).map((c) => ({ id: c.id, name: c.name }))}
              testers={(testers ?? []).map((t) => ({ id: t.id, name: t.full_name }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
