"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/db-errors";
import { checkEquipment, hasBlocking } from "@/lib/rules";
import { checkPracticalAssignment } from "@/lib/server/assignment";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import {
  practicalAssignmentSchema,
  sessionSchema,
  theoryResultSchema,
} from "@/lib/validation/candidates";

const BACK_OFFICE = ["admin", "secretariat"] as const;
const uuid = z.string().uuid();

function sessionPath(id: string) {
  return `/app/sessions/${id}`;
}

export async function saveSession(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, name, startsOn, endsOn, location, status, notes } = parsed.data;
  const values = { name, starts_on: startsOn, ends_on: endsOn, location, status, notes };

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("sessions").update(values).eq("id", id);
    if (error) return { message: dbErrorMessage(error) };
    revalidatePath(sessionPath(id));
    return { ok: true, message: "Session enregistrée." };
  }
  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...values, organization_id: session.organization.id })
    .select("id")
    .single();
  if (error) return { message: dbErrorMessage(error) };
  redirect(sessionPath(data.id));
}

export async function addSessionTester(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const sessionId = uuid.parse(formData.get("sessionId"));
  const testerId = uuid.safeParse(formData.get("testerId"));
  if (!testerId.success) return { message: "Choisissez un testeur." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_testers")
    .insert({ organization_id: session.organization.id, session_id: sessionId, tester_id: testerId.data });
  if (error) return { message: error.code === "23505" ? "Ce testeur est déjà affecté." : dbErrorMessage(error) };
  revalidatePath(sessionPath(sessionId));
  return { ok: true };
}

export async function addSessionEquipment(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const sessionId = uuid.parse(formData.get("sessionId"));
  const equipmentId = uuid.safeParse(formData.get("equipmentId"));
  if (!equipmentId.success) return { message: "Choisissez un engin." };

  const supabase = await createClient();
  const [{ data: testSession }, { data: equipment }] = await Promise.all([
    supabase.from("sessions").select("starts_on, ends_on").eq("id", sessionId).single(),
    supabase
      .from("equipment")
      .select("name, serial_number, category_id, last_inspection_on")
      .eq("id", equipmentId.data)
      .single(),
  ]);
  if (!testSession || !equipment) return { message: "Élément introuvable : rechargez la page." };

  // The inspection must be valid on every day of the session.
  const rule = (date: string) =>
    checkEquipment(
      {
        name: equipment.name,
        serialNumber: equipment.serial_number,
        categoryId: equipment.category_id,
        lastInspectionOn: equipment.last_inspection_on,
      },
      equipment.category_id,
      "",
      date,
    );
  const violations = [...rule(testSession.starts_on), ...rule(testSession.ends_on)].filter(
    (v, i, all) => all.findIndex((w) => w.code === v.code) === i,
  );
  if (hasBlocking(violations)) return { violations };

  const { error } = await supabase.from("session_equipment").insert({
    organization_id: session.organization.id,
    session_id: sessionId,
    equipment_id: equipmentId.data,
  });
  if (error) return { message: error.code === "23505" ? "Cet engin est déjà affecté." : dbErrorMessage(error) };
  revalidatePath(sessionPath(sessionId));
  return { ok: true };
}

export async function removeSessionResource(formData: FormData) {
  await requireSession(BACK_OFFICE);
  const sessionId = uuid.parse(formData.get("sessionId"));
  const kind = z.enum(["tester", "equipment", "candidate"]).parse(formData.get("kind"));
  const id = uuid.parse(formData.get("id"));
  const supabase = await createClient();
  if (kind === "tester") {
    await supabase.from("session_testers").delete().eq("session_id", sessionId).eq("tester_id", id);
  } else if (kind === "equipment") {
    await supabase.from("session_equipment").delete().eq("session_id", sessionId).eq("equipment_id", id);
  } else {
    await supabase.from("session_candidates").delete().eq("id", id);
  }
  revalidatePath(sessionPath(sessionId));
}

export async function addSessionCandidate(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const sessionId = uuid.parse(formData.get("sessionId"));
  const candidateId = uuid.safeParse(formData.get("candidateId"));
  if (!candidateId.success) return { message: "Choisissez un candidat." };
  const supabase = await createClient();
  const { error } = await supabase.from("session_candidates").insert({
    organization_id: session.organization.id,
    session_id: sessionId,
    candidate_id: candidateId.data,
  });
  if (error) return { message: error.code === "23505" ? "Ce candidat est déjà inscrit." : dbErrorMessage(error) };
  revalidatePath(sessionPath(sessionId));
  return { ok: true };
}

export async function addPracticalTest(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const parsed = practicalAssignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const violations = await checkPracticalAssignment({
    organizationSiret: session.organization.siret,
    sessionCandidateId: input.sessionCandidateId,
    categoryId: input.categoryId,
    testerId: input.testerId,
    equipmentId: input.equipmentId,
    testDate: input.testDate,
  });
  if (hasBlocking(violations)) return { violations };
  if (violations.length > 0 && !input.confirmWarnings) {
    return {
      violations,
      message: "Vérifiez les avertissements ci-dessous, puis cochez la case de confirmation pour continuer.",
    };
  }

  const supabase = await createClient();
  const { data: grid } = await supabase
    .from("grids")
    .select("id")
    .eq("category_id", input.categoryId)
    .eq("is_active", true)
    .maybeSingle();
  if (!grid) return { message: "Aucune grille active pour cette catégorie : créez-la dans le référentiel." };

  const { error } = await supabase.from("practical_tests").insert({
    organization_id: session.organization.id,
    session_candidate_id: input.sessionCandidateId,
    category_id: input.categoryId,
    grid_id: grid.id,
    tester_id: input.testerId,
    equipment_id: input.equipmentId,
    test_date: input.testDate,
  });
  if (error) {
    return {
      message: error.code === "23505" ? "Ce candidat a déjà une épreuve pour cette catégorie." : dbErrorMessage(error),
    };
  }
  revalidatePath(sessionPath(input.sessionId));
  return { ok: true, message: "Épreuve pratique planifiée." };
}

export async function deletePracticalTest(formData: FormData) {
  await requireSession(BACK_OFFICE);
  const sessionId = uuid.parse(formData.get("sessionId"));
  const id = uuid.parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("practical_tests").delete().eq("id", id).eq("status", "pending").is("started_at", null);
  revalidatePath(sessionPath(sessionId));
}

export async function saveTheoryResult(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(BACK_OFFICE);
  const parsed = theoryResultSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const t = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("theory_results")
    .upsert(
      {
        organization_id: session.organization.id,
        session_candidate_id: t.sessionCandidateId,
        recommendation_id: t.recommendationId,
        kind: t.kind,
        score: t.score,
        max_score: t.maxScore,
        taken_on: t.takenOn,
        // Recomputed by the database from the referential pass mark.
        passed: false,
      },
      { onConflict: "session_candidate_id,recommendation_id,kind" },
    )
    .select("passed")
    .single();
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath(sessionPath(t.sessionId));
  return {
    ok: true,
    message: data.passed ? "Résultat enregistré : théorie réussie." : "Résultat enregistré : théorie échouée.",
  };
}
