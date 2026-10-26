import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpiryBadge, formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { getCategoryOptions } from "@/lib/queries/referential";
import { addDays, compareDates, expiryState, inspectionDueDate } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import { SESSION_STATUS_LABELS, type TestSession } from "@/lib/types";
import { CsvImportForm } from "../../candidats/forms";
import { IssueCertificateForm } from "../../certificats/forms";
import { deletePracticalTest, removeSessionResource } from "../actions";
import {
  AddCandidateForm,
  AddEquipmentForm,
  AddTesterForm,
  PracticalTestForm,
  SessionForm,
  TheoryForm,
} from "../forms";

export const metadata: Metadata = { title: "Session" };

const PRACTICAL_LABELS = {
  pending: { label: "À passer", variant: "outline" },
  incomplete: { label: "En cours", variant: "warning" },
  passed: { label: "Réussi", variant: "success" },
  failed: { label: "Échoué", variant: "destructive" },
} as const;

type PracticalRow = {
  id: string;
  category_id: string;
  tester_id: string | null;
  equipment_id: string | null;
  test_date: string;
  status: keyof typeof PRACTICAL_LABELS;
  score: number | null;
  started_at: string | null;
};
type TheoryRow = { id: string; recommendation_id: string; kind: "qcm" | "qcm_ipr"; score: number; max_score: number; passed: boolean };
type SessionCandidateRow = {
  id: string;
  identity_verified: boolean;
  candidates: { id: string; first_name: string; last_name: string; photo_path: string | null; trainer_name: string | null; client_companies: { name: string } | null };
  practical_tests: PracticalRow[];
  theory_results: TheoryRow[];
};

function RemoveButton({ sessionId, kind, id, label }: { sessionId: string; kind: string; id: string; label: string }) {
  return (
    <form action={removeSessionResource}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" aria-label={label}>
        Retirer
      </Button>
    </form>
  );
}

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();

  const [{ data: session }, { data: sessionTesters }, { data: sessionEquipment }, { data: sessionCandidates }, { data: testers }, { data: equipment }, { data: candidates }, { data: recommendations }, categories, { data: certificates }] =
    await Promise.all([
      supabase.from("sessions").select("id, name, starts_on, ends_on, location, status, notes").eq("id", sessionId).maybeSingle<TestSession>(),
      supabase.from("session_testers").select("tester_id, testers(id, full_name)").eq("session_id", sessionId),
      supabase.from("session_equipment").select("equipment_id, equipment(id, name, serial_number, category_id, last_inspection_on)").eq("session_id", sessionId),
      supabase
        .from("session_candidates")
        .select(
          "id, identity_verified, candidates(id, first_name, last_name, photo_path, trainer_name, client_companies(name)), practical_tests(id, category_id, tester_id, equipment_id, test_date, status, score, started_at), theory_results(id, recommendation_id, kind, score, max_score, passed)",
        )
        .eq("session_id", sessionId)
        .order("created_at"),
      supabase.from("testers").select("id, full_name").eq("active", true).order("full_name"),
      supabase.from("equipment").select("id, name, serial_number").eq("active", true).order("name"),
      supabase.from("candidates").select("id, first_name, last_name, birth_date").is("anonymized_at", null).order("last_name").limit(500),
      supabase.from("recommendations").select("id, code, label, requires_ipr").order("code"),
      getCategoryOptions(),
      supabase.from("certificates").select("id, number, candidate_id, recommendation_id, revoked_at").eq("session_id", sessionId),
    ]);
  if (!session) notFound();

  const assignedTesters = (sessionTesters ?? []).map((s) => s.testers as unknown as { id: string; full_name: string });
  const assignedEquipment = (sessionEquipment ?? []).map(
    (s) => s.equipment as unknown as { id: string; name: string; serial_number: string; category_id: string; last_inspection_on: string | null },
  );
  const rows = (sessionCandidates as unknown as SessionCandidateRow[] | null) ?? [];
  const enrolled = new Set(rows.map((r) => r.candidates.id));

  const dates: string[] = [];
  for (let d = session.starts_on; compareDates(d, session.ends_on) <= 0 && dates.length < 31; d = addDays(d, 1)) dates.push(d);

  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.shortLabel ?? "Catégorie";
  const testerName = (id: string | null) => assignedTesters.find((t) => t.id === id)?.full_name ?? "—";
  const equipmentName = (id: string | null) => {
    const e = assignedEquipment.find((x) => x.id === id);
    return e ? `${e.name} (n° ${e.serial_number})` : "—";
  };
  const categoryChoices = categories.map((c) => ({
    id: c.id,
    label: c.shortLabel,
    equipment: assignedEquipment.filter((e) => e.category_id === c.id).map((e) => ({ id: e.id, label: `${e.name} (n° ${e.serial_number})` })),
  }));
  const recommendationCode = (id: string) => recommendations?.find((r) => r.id === id)?.code ?? "";

  /** Recommendations for which the candidate passed the theory and at least one practical category. */
  const certifiable = (row: SessionCandidateRow) =>
    (recommendations ?? []).filter((r) => {
      const theoryOk = (r.requires_ipr ? ["qcm", "qcm_ipr"] : ["qcm"]).every((kind) =>
        row.theory_results.some((t) => t.recommendation_id === r.id && t.kind === kind && t.passed),
      );
      const practicalOk = row.practical_tests.some(
        (pt) => pt.status === "passed" && categories.find((c) => c.id === pt.category_id)?.recommendationId === r.id,
      );
      return theoryOk && practicalOk;
    });

  return (
    <>
      <PageHeader
        title={session.name}
        description={
          <>
            {formatDate(session.starts_on)}
            {session.ends_on !== session.starts_on ? ` au ${formatDate(session.ends_on)}` : ""} · {session.location} ·{" "}
            <Link href="/app/sessions" className="underline">
              toutes les sessions
            </Link>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{SESSION_STATUS_LABELS[session.status]}</Badge>
            <Button asChild variant="outline">
              <a href={`/app/sessions/${session.id}/convocations`} download>
                Convocations (PDF)
              </a>
            </Button>
            {user.profile.role === "admin" ? (
              <Button asChild variant="outline">
                <a href={`/app/sessions/${session.id}/export`} download>
                  Exporter le dossier d&apos;audit (ZIP)
                </a>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Testeurs affectés</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ul className="grid gap-2">
                {assignedTesters.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-md border-2 px-3 py-2">
                    <span className="font-semibold">{t.full_name}</span>
                    <RemoveButton sessionId={session.id} kind="tester" id={t.id} label={`Retirer ${t.full_name}`} />
                  </li>
                ))}
              </ul>
              <AddTesterForm
                sessionId={session.id}
                options={(testers ?? []).filter((t) => !assignedTesters.some((a) => a.id === t.id)).map((t) => ({ id: t.id, label: t.full_name }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Engins affectés</CardTitle>
              <CardDescription>Vérification périodique de moins d&apos;un an exigée sur toute la durée de la session.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ul className="grid gap-2">
                {assignedEquipment.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border-2 px-3 py-2">
                    <span className="font-semibold">{e.name}</span>
                    <span className="text-muted-foreground">
                      n° {e.serial_number} · {categoryLabel(e.category_id)}
                    </span>
                    {e.last_inspection_on ? (
                      <ExpiryBadge state={expiryState(inspectionDueDate(e.last_inspection_on), session.ends_on)} expiredLabel="Vérification de plus d'un an" />
                    ) : null}
                    <span className="ml-auto">
                      <RemoveButton sessionId={session.id} kind="equipment" id={e.id} label={`Retirer ${e.name}`} />
                    </span>
                  </li>
                ))}
              </ul>
              <AddEquipmentForm
                sessionId={session.id}
                options={(equipment ?? []).filter((e) => !assignedEquipment.some((a) => a.id === e.id)).map((e) => ({ id: e.id, label: `${e.name} (n° ${e.serial_number})` }))}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Candidats ({rows.length})</CardTitle>
            <CardDescription>Planifiez pour chacun les épreuves pratiques et saisissez les résultats de théorie.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {rows.map((row) => (
              <section key={row.id} aria-label={`${row.candidates.first_name} ${row.candidates.last_name}`} className="grid gap-4 rounded-lg border-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/app/candidats/${row.candidates.id}`} className="text-xl font-bold text-primary underline">
                    {row.candidates.last_name.toUpperCase()} {row.candidates.first_name}
                  </Link>
                  {row.candidates.client_companies ? <span className="text-muted-foreground">{row.candidates.client_companies.name}</span> : null}
                  {!row.candidates.photo_path ? <Badge variant="warning">Photo manquante</Badge> : null}
                  {row.identity_verified ? <Badge variant="success">Identité contrôlée</Badge> : <Badge variant="outline">Identité à contrôler</Badge>}
                  {row.practical_tests.length === 0 ? (
                    <span className="ml-auto">
                      <RemoveButton sessionId={session.id} kind="candidate" id={row.id} label={`Retirer ${row.candidates.first_name} ${row.candidates.last_name}`} />
                    </span>
                  ) : null}
                </div>

                {row.practical_tests.length ? (
                  <ul className="grid gap-2">
                    {row.practical_tests.map((pt) => (
                      <li key={pt.id} className="flex flex-wrap items-center gap-3 rounded-md bg-muted px-3 py-2">
                        <strong>{categoryLabel(pt.category_id)}</strong>
                        <span>
                          {testerName(pt.tester_id)} · {equipmentName(pt.equipment_id)} · {formatDate(pt.test_date)}
                        </span>
                        <Badge variant={PRACTICAL_LABELS[pt.status].variant}>
                          {PRACTICAL_LABELS[pt.status].label}
                          {pt.score !== null ? ` · ${Number(pt.score)}/100` : ""}
                        </Badge>
                        {pt.status === "pending" && !pt.started_at ? (
                          <form action={deletePracticalTest} className="ml-auto">
                            <input type="hidden" name="sessionId" value={session.id} />
                            <input type="hidden" name="id" value={pt.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Annuler l&apos;épreuve
                            </Button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {row.theory_results.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {row.theory_results.map((t) => (
                      <li key={t.id}>
                        <Badge variant={t.passed ? "success" : "destructive"}>
                          {recommendationCode(t.recommendation_id)} {t.kind === "qcm" ? "QCM" : "QCM-IPR"} : {Number(t.score)}/{Number(t.max_score)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {(() => {
                  const issued = (certificates ?? []).filter((c) => c.candidate_id === row.candidates.id);
                  const toIssue = certifiable(row).filter((r) => !issued.some((c) => c.recommendation_id === r.id));
                  if (!issued.length && !toIssue.length) return null;
                  return (
                    <div className="flex flex-wrap items-start gap-3">
                      {issued.map((c) => (
                        <Button key={c.id} asChild variant="outline">
                          <Link href={`/app/certificats/${c.id}`}>
                            Certificat {c.number}
                            {c.revoked_at ? " (révoqué)" : ""}
                          </Link>
                        </Button>
                      ))}
                      {toIssue.map((r) => (
                        <IssueCertificateForm
                          key={r.id}
                          sessionId={session.id}
                          sessionCandidateId={row.id}
                          recommendationId={r.id}
                          recommendationCode={r.code}
                        />
                      ))}
                    </div>
                  );
                })()}

                <details>
                  <summary className="cursor-pointer font-semibold text-primary">Planifier une épreuve pratique</summary>
                  <div className="pt-3">
                    <PracticalTestForm
                      sessionId={session.id}
                      sessionCandidateId={row.id}
                      categories={categoryChoices}
                      testers={assignedTesters.map((t) => ({ id: t.id, label: t.full_name }))}
                      dates={dates}
                    />
                  </div>
                </details>
                <details>
                  <summary className="cursor-pointer font-semibold text-primary">Saisir un résultat de théorie</summary>
                  <div className="pt-3">
                    <TheoryForm
                      sessionId={session.id}
                      sessionCandidateId={row.id}
                      defaultDate={session.starts_on}
                      recommendations={(recommendations ?? []).map((r) => ({ id: r.id, label: `${r.code} · ${r.label}`, requiresIpr: r.requires_ipr }))}
                    />
                  </div>
                </details>
              </section>
            ))}

            <div className="grid gap-6 rounded-lg border-2 border-dashed p-4 lg:grid-cols-2">
              <div className="grid content-start gap-2">
                <h3 className="text-lg font-bold">Inscrire un candidat</h3>
                <AddCandidateForm
                  sessionId={session.id}
                  options={(candidates ?? []).filter((c) => !enrolled.has(c.id)).map((c) => ({ id: c.id, label: `${c.last_name.toUpperCase()} ${c.first_name} (${formatDate(c.birth_date)})` }))}
                />
                <p className="text-sm text-muted-foreground">
                  Nouveau candidat ?{" "}
                  <Link href="/app/candidats" className="underline">
                    Créez sa fiche
                  </Link>{" "}
                  puis inscrivez-le ici.
                </p>
              </div>
              <div className="grid content-start gap-2">
                <h3 className="text-lg font-bold">Importer une liste (CSV)</h3>
                <CsvImportForm sessionId={session.id} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations de la session</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionForm session={session} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
