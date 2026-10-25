import "server-only";
import { ZipArchive } from "archiver";
import { APP_NAME } from "@/lib/constants";
import { ensureCertificatePdf } from "@/lib/certificates/service";
import { IDENTITY_DOCUMENT_TYPES, type IdentityDocumentType } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "./csv";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type SessionRow = { id: string; name: string; starts_on: string; ends_on: string; location: string; status: string; notes: string | null };
type TesterCaces = { category_id: string; certificate_number: string; issuer_name: string; issuer_siret: string; expires_on: string };
type TesterLine = { full_name: string; caces?: TesterCaces };
type TesterRow = {
  testers: {
    id: string;
    full_name: string;
    tester_personal_caces: TesterCaces[];
  };
};
type EquipmentRow = {
  equipment: { name: string; serial_number: string; last_inspection_on: string | null; categories: { code: string; recommendations: { code: string } } };
};
type CandidateRow = {
  id: string;
  identity_document_type: IdentityDocumentType | null;
  identity_document_number: string | null;
  identity_verified: boolean;
  identity_verified_at: string | null;
  candidates: { first_name: string; last_name: string; birth_date: string; client_companies: { name: string } | null };
  theory_results: { recommendations: { code: string }; kind: string; score: number; max_score: number; passed: boolean; taken_on: string }[];
  practical_tests: {
    id: string;
    test_date: string;
    status: string;
    score: number | null;
    started_at: string | null;
    ended_at: string | null;
    duration_seconds: number | null;
    signed_at: string | null;
    tester_signature_path: string | null;
    categories: { code: string; recommendations: { code: string } };
    testers: { full_name: string } | null;
    equipment: { name: string; serial_number: string; last_inspection_on: string | null } | null;
    grids: { name: string; version: number; pass_score: number };
    practical_results: {
      points: number;
      eliminatory_fault: boolean;
      comment: string | null;
      grid_items: { position: number; label: string; max_points: number; eliminatory: boolean };
    }[];
  }[];
};
type CertificateRow = {
  id: string;
  number: string;
  candidate_id: string;
  holder_last_name: string;
  holder_first_name: string;
  recommendation_code: string;
  issued_on: string;
  expires_on: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  pdf_path: string | null;
  certificate_categories: { category_code: string }[];
};
type AuditRow = { created_at: string; actor_id: string | null; action: string; table_name: string | null; record_id: string | null; old_data: unknown; new_data: unknown };

const PRACTICAL_STATUS: Record<string, string> = { pending: "À passer", incomplete: "En cours", passed: "Réussi", failed: "Échoué" };

/** Safe, readable file name part. */
export function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "";
}

async function download(supabase: Supabase, bucket: string, path: string | null): Promise<Buffer | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).download(path);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

/**
 * Everything an auditor asks about a session, in one ZIP: who tested whom,
 * with which equipment (inspection dates), identity checks, grids marked
 * criterion by criterion, signatures, certificates, and the change log.
 * Runs as the signed-in admin: RLS keeps it to their organization.
 */
export async function buildSessionAuditZip(sessionId: string, exportedBy: string): Promise<{ fileName: string; zip: Buffer } | null> {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, starts_on, ends_on, location, status, notes")
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();
  if (!session) return null;

  const [{ data: testers }, { data: equipment }, { data: candidates }, { data: certificates }, { data: categories }] = await Promise.all([
    supabase
      .from("session_testers")
      .select("testers(id, full_name, tester_personal_caces(category_id, certificate_number, issuer_name, issuer_siret, expires_on))")
      .eq("session_id", sessionId)
      .returns<TesterRow[]>(),
    supabase
      .from("session_equipment")
      .select("equipment(name, serial_number, last_inspection_on, categories(code, recommendations(code)))")
      .eq("session_id", sessionId)
      .returns<EquipmentRow[]>(),
    supabase
      .from("session_candidates")
      .select(
        `id, identity_document_type, identity_document_number, identity_verified, identity_verified_at,
         candidates(first_name, last_name, birth_date, client_companies(name)),
         theory_results(kind, score, max_score, passed, taken_on, recommendations(code)),
         practical_tests(id, test_date, status, score, started_at, ended_at, duration_seconds, signed_at, tester_signature_path,
           categories(code, recommendations(code)), testers(full_name), equipment(name, serial_number, last_inspection_on),
           grids(name, version, pass_score),
           practical_results(points, eliminatory_fault, comment, grid_items(position, label, max_points, eliminatory)))`,
      )
      .eq("session_id", sessionId)
      .returns<CandidateRow[]>(),
    supabase
      .from("certificates")
      .select("id, number, candidate_id, holder_last_name, holder_first_name, recommendation_code, issued_on, expires_on, revoked_at, revocation_reason, pdf_path, certificate_categories(category_code)")
      .eq("session_id", sessionId)
      .order("number")
      .returns<CertificateRow[]>(),
    supabase.from("categories").select("id, code, recommendations(code)").returns<{ id: string; code: string; recommendations: { code: string } }[]>(),
  ]);

  const rows = candidates ?? [];
  const categoryLabel = (id: string) => {
    const c = categories?.find((x) => x.id === id);
    return c ? `${c.recommendations.code} cat. ${c.code}` : id;
  };
  const name = (r: CandidateRow) => `${r.candidates.last_name.toUpperCase()} ${r.candidates.first_name}`;
  const tests = rows.flatMap((r) => r.practical_tests.map((t) => ({ candidate: r, test: t })));

  // Change log of the session and of everything attached to it.
  const scIds = rows.map((r) => r.id);
  const ptIds = tests.map((x) => x.test.id);
  const certIds = (certificates ?? []).map((c) => c.id);
  const list = (ids: string[]) => `(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"})`;
  const { data: audit } = await supabase
    .from("audit_log")
    .select("created_at, actor_id, action, table_name, record_id, old_data, new_data")
    .or(
      [
        `record_id.eq.${sessionId}`,
        `new_data->>session_id.eq.${sessionId}`,
        `old_data->>session_id.eq.${sessionId}`,
        `new_data->>session_candidate_id.in.${list(scIds)}`,
        `old_data->>session_candidate_id.in.${list(scIds)}`,
        `new_data->>practical_test_id.in.${list(ptIds)}`,
        `old_data->>practical_test_id.in.${list(ptIds)}`,
        `record_id.in.${list(certIds)}`,
        `new_data->>certificate_id.in.${list(certIds)}`,
      ].join(","),
    )
    .order("created_at")
    .limit(10_000)
    .returns<AuditRow[]>();
  const actorIds = [...new Set((audit ?? []).map((a) => a.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const actorName = (id: string | null) => (id ? (actors?.find((a) => a.id === id)?.full_name ?? id) : "Système");

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });

  const generatedAt = dateTime(new Date().toISOString());
  archive.append(
    [
      `Dossier d'audit de la session « ${session.name} »`,
      `Généré par ${APP_NAME} le ${generatedAt}, par ${exportedBy}.`,
      "",
      "session.csv        informations de la session",
      "testeurs.csv       testeurs affectés et leurs CACES® personnels (délivrés par un autre OTC)",
      "engins.csv         engins affectés et date de leur dernière vérification périodique",
      "candidats.csv      candidats et contrôle d'identité (pièce, numéro, date et heure)",
      "theorie.csv        résultats des épreuves théoriques",
      "pratique.csv       épreuves pratiques : testeur, engin, durée, score, signature",
      "grilles/           grille de chaque épreuve pratique, critère par critère",
      "signatures/        signatures des testeurs",
      "certificats.csv    certificats délivrés (et révocations)",
      "certificats/       certificats au format PDF",
      "journal.csv        journal des modifications (qui, quoi, quand)",
      "",
      "Les fichiers CSV s'ouvrent dans Excel ou LibreOffice (séparateur point-virgule).",
      "",
    ].join("\r\n"),
    { name: "LISEZMOI.txt" },
  );

  archive.append(
    toCsv(
      [
        { header: "Session", value: (s: SessionRow) => s.name },
        { header: "Début", value: (s) => s.starts_on },
        { header: "Fin", value: (s) => s.ends_on },
        { header: "Lieu", value: (s) => s.location },
        { header: "Statut", value: (s) => s.status },
        { header: "Notes", value: (s) => s.notes },
      ],
      [session],
    ),
    { name: "session.csv" },
  );

  archive.append(
    toCsv(
      [
        { header: "Testeur", value: (t: TesterLine) => t.full_name },
        { header: "CACES® personnel", value: (t) => (t.caces ? categoryLabel(t.caces.category_id) : "") },
        { header: "Numéro", value: (t) => t.caces?.certificate_number ?? "" },
        { header: "Délivré par", value: (t) => t.caces?.issuer_name ?? "" },
        { header: "SIRET de l'OTC émetteur", value: (t) => t.caces?.issuer_siret ?? "" },
        { header: "Valable jusqu'au", value: (t) => t.caces?.expires_on ?? "" },
      ],
      (testers ?? []).flatMap((row) =>
        row.testers.tester_personal_caces.length
          ? row.testers.tester_personal_caces.map((caces): TesterLine => ({ full_name: row.testers.full_name, caces }))
          : [{ full_name: row.testers.full_name }],
      ),
    ),
    { name: "testeurs.csv" },
  );

  archive.append(
    toCsv(
      [
        { header: "Engin", value: (e: EquipmentRow["equipment"]) => e.name },
        { header: "Numéro de série", value: (e) => e.serial_number },
        { header: "Catégorie", value: (e) => `${e.categories.recommendations.code} cat. ${e.categories.code}` },
        { header: "Dernière vérification périodique", value: (e) => e.last_inspection_on },
      ],
      (equipment ?? []).map((row) => row.equipment),
    ),
    { name: "engins.csv" },
  );

  archive.append(
    toCsv(
      [
        { header: "Candidat", value: (r: CandidateRow) => name(r) },
        { header: "Date de naissance", value: (r) => r.candidates.birth_date },
        { header: "Entreprise", value: (r) => r.candidates.client_companies?.name },
        { header: "Pièce d'identité", value: (r) => (r.identity_document_type ? IDENTITY_DOCUMENT_TYPES[r.identity_document_type] : "") },
        { header: "Numéro de la pièce", value: (r) => r.identity_document_number },
        { header: "Identité vérifiée", value: (r) => r.identity_verified },
        { header: "Vérifiée le", value: (r) => dateTime(r.identity_verified_at) },
      ],
      rows,
    ),
    { name: "candidats.csv" },
  );

  archive.append(
    toCsv(
      [
        { header: "Candidat", value: (x: { r: CandidateRow; t: CandidateRow["theory_results"][number] }) => name(x.r) },
        { header: "Recommandation", value: (x) => x.t.recommendations.code },
        { header: "Épreuve", value: (x) => (x.t.kind === "qcm" ? "QCM" : "QCM-IPR") },
        { header: "Date", value: (x) => x.t.taken_on },
        { header: "Score", value: (x) => `${Number(x.t.score)}/${Number(x.t.max_score)}` },
        { header: "Réussie", value: (x) => x.t.passed },
      ],
      rows.flatMap((r) => r.theory_results.map((t) => ({ r, t }))),
    ),
    { name: "theorie.csv" },
  );

  const testFile = (x: (typeof tests)[number]) =>
    slug(`${x.candidate.candidates.last_name}-${x.candidate.candidates.first_name}-${x.test.categories.recommendations.code}-${x.test.categories.code}`);

  archive.append(
    toCsv(
      [
        { header: "Candidat", value: (x: (typeof tests)[number]) => name(x.candidate) },
        { header: "Catégorie", value: (x) => `${x.test.categories.recommendations.code} cat. ${x.test.categories.code}` },
        { header: "Date", value: (x) => x.test.test_date },
        { header: "Testeur", value: (x) => x.test.testers?.full_name },
        { header: "Engin", value: (x) => (x.test.equipment ? `${x.test.equipment.name} (n° ${x.test.equipment.serial_number})` : "") },
        { header: "Vérification de l'engin", value: (x) => x.test.equipment?.last_inspection_on },
        { header: "Grille", value: (x) => `${x.test.grids.name} (v${x.test.grids.version})` },
        { header: "Début", value: (x) => dateTime(x.test.started_at) },
        { header: "Fin", value: (x) => dateTime(x.test.ended_at) },
        { header: "Durée (min)", value: (x) => (x.test.duration_seconds === null ? "" : Math.round(x.test.duration_seconds / 60)) },
        { header: "Score /100", value: (x) => (x.test.score === null ? "" : Number(x.test.score)) },
        { header: "Résultat", value: (x) => PRACTICAL_STATUS[x.test.status] ?? x.test.status },
        { header: "Signée le", value: (x) => dateTime(x.test.signed_at) },
        { header: "Fichier grille", value: (x) => `grilles/${testFile(x)}.csv` },
      ],
      tests,
    ),
    { name: "pratique.csv" },
  );

  for (const x of tests) {
    const results = [...x.test.practical_results].sort((a, b) => a.grid_items.position - b.grid_items.position);
    archive.append(
      toCsv(
        [
          { header: "N°", value: (r: (typeof results)[number]) => r.grid_items.position },
          { header: "Critère", value: (r) => r.grid_items.label },
          { header: "Éliminatoire", value: (r) => r.grid_items.eliminatory },
          { header: "Points", value: (r) => Number(r.points) },
          { header: "Sur", value: (r) => Number(r.grid_items.max_points) },
          { header: "Faute éliminatoire", value: (r) => r.eliminatory_fault },
          { header: "Commentaire", value: (r) => r.comment },
        ],
        results,
      ),
      { name: `grilles/${testFile(x)}.csv` },
    );
    const signature = await download(supabase, "signatures", x.test.tester_signature_path);
    if (signature) archive.append(signature, { name: `signatures/${testFile(x)}.png` });
  }

  archive.append(
    toCsv(
      [
        { header: "Numéro", value: (c: CertificateRow) => c.number },
        { header: "Titulaire", value: (c) => `${c.holder_last_name.toUpperCase()} ${c.holder_first_name}` },
        { header: "Recommandation", value: (c) => c.recommendation_code },
        { header: "Catégories", value: (c) => c.certificate_categories.map((x) => x.category_code).sort().join(", ") },
        { header: "Délivré le", value: (c) => c.issued_on },
        { header: "Valable jusqu'au", value: (c) => c.expires_on },
        { header: "Révoqué le", value: (c) => dateTime(c.revoked_at) },
        { header: "Motif de révocation", value: (c) => c.revocation_reason },
      ],
      certificates ?? [],
    ),
    { name: "certificats.csv" },
  );
  for (const cert of certificates ?? []) {
    const path = cert.pdf_path ?? (await ensureCertificatePdf(cert.id).catch(() => null));
    const pdf = await download(supabase, "certificates", path);
    if (pdf) archive.append(pdf, { name: `certificats/${slug(cert.number)}.pdf` });
  }

  archive.append(
    toCsv(
      [
        { header: "Date", value: (a: AuditRow) => dateTime(a.created_at) },
        { header: "Auteur", value: (a) => actorName(a.actor_id) },
        { header: "Action", value: (a) => a.action },
        { header: "Table", value: (a) => a.table_name },
        { header: "Identifiant", value: (a) => a.record_id },
        { header: "Avant", value: (a) => (a.old_data ? JSON.stringify(a.old_data) : "") },
        { header: "Après", value: (a) => (a.new_data ? JSON.stringify(a.new_data) : "") },
      ],
      audit ?? [],
    ),
    { name: "journal.csv" },
  );

  await archive.finalize();
  await done;
  return { fileName: `audit-${slug(session.name)}-${session.starts_on}.zip`, zip: Buffer.concat(chunks) };
}
