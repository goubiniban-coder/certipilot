import "server-only";
import type { CandidateCsvRow } from "@/lib/csv/candidates";
import { sameName } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";

export interface ImportResult {
  created: number;
  existing: number;
  addedToSession: number;
}

/**
 * Creates the candidates of a parsed CSV (skipping those already known with
 * the same name and birth date), creates missing client companies, links the
 * trainer to a tester record when the names match, and optionally enrols
 * everyone in a session.
 */
export async function importCandidates(
  organizationId: string,
  rows: CandidateCsvRow[],
  sessionId?: string | null,
): Promise<ImportResult> {
  const supabase = await createClient();
  const [{ data: companies }, { data: testers }, { data: known }] = await Promise.all([
    supabase.from("client_companies").select("id, name"),
    supabase.from("testers").select("id, full_name"),
    supabase.from("candidates").select("id, last_name, first_name, birth_date"),
  ]);

  const companyIds = new Map((companies ?? []).map((c) => [c.name.trim().toLowerCase(), c.id as string]));
  const result: ImportResult = { created: 0, existing: 0, addedToSession: 0 };
  const candidateIds: string[] = [];

  for (const row of rows) {
    const existing = (known ?? []).find(
      (c) => c.birth_date === row.birthDate && sameName(`${c.first_name} ${c.last_name}`, `${row.firstName} ${row.lastName}`),
    );
    if (existing) {
      result.existing++;
      candidateIds.push(existing.id);
      continue;
    }

    let clientCompanyId: string | null = null;
    if (row.company) {
      const key = row.company.trim().toLowerCase();
      clientCompanyId = companyIds.get(key) ?? null;
      if (!clientCompanyId) {
        const { data, error } = await supabase
          .from("client_companies")
          .insert({ organization_id: organizationId, name: row.company.trim() })
          .select("id")
          .single();
        if (error) throw error;
        clientCompanyId = data.id;
        companyIds.set(key, data.id);
      }
    }

    const trainer = row.trainerName
      ? (testers ?? []).find((t) => sameName(t.full_name, row.trainerName!))
      : undefined;

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        organization_id: organizationId,
        last_name: row.lastName,
        first_name: row.firstName,
        birth_date: row.birthDate,
        email: row.email,
        client_company_id: clientCompanyId,
        trainer_name: row.trainerName,
        trainer_tester_id: trainer?.id ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    result.created++;
    candidateIds.push(data.id);
  }

  if (sessionId && candidateIds.length > 0) {
    const { data, error } = await supabase
      .from("session_candidates")
      .upsert(
        candidateIds.map((candidateId) => ({
          organization_id: organizationId,
          session_id: sessionId,
          candidate_id: candidateId,
        })),
        { onConflict: "session_id,candidate_id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    result.addedToSession = data?.length ?? 0;
  }

  return result;
}
