import "server-only";
import {
  checkEquipment,
  checkTesterAssignment,
  type TesterProfile,
  type Violation,
} from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";

export interface AssignmentRequest {
  organizationSiret: string;
  sessionCandidateId: string;
  categoryId: string;
  testerId: string;
  equipmentId: string;
  testDate: string;
}

/** Loads what the rules need and returns every violation, in French. */
export async function checkPracticalAssignment(request: AssignmentRequest): Promise<Violation[]> {
  const supabase = await createClient();
  const [{ data: sc }, { data: tester }, { data: equipment }, { data: category }] = await Promise.all([
    supabase
      .from("session_candidates")
      .select("id, candidates(first_name, last_name, trainer_tester_id, trainer_name)")
      .eq("id", request.sessionCandidateId)
      .single(),
    supabase
      .from("testers")
      .select("id, full_name, tester_qualifications(category_id, active), tester_personal_caces(category_id, issuer_siret, expires_on)")
      .eq("id", request.testerId)
      .single(),
    supabase
      .from("equipment")
      .select("name, serial_number, category_id, last_inspection_on")
      .eq("id", request.equipmentId)
      .single(),
    supabase.from("categories").select("code, recommendations(code)").eq("id", request.categoryId).single(),
  ]);

  if (!sc || !tester || !equipment || !category) {
    return [{ code: "NOT_FOUND", severity: "blocking", message: "Élément introuvable : rechargez la page." }];
  }

  const candidate = sc.candidates as unknown as {
    first_name: string;
    last_name: string;
    trainer_tester_id: string | null;
    trainer_name: string | null;
  };
  const categoryLabel = `${(category.recommendations as unknown as { code: string }).code} cat. ${category.code}`;

  const profile: TesterProfile = {
    id: tester.id,
    fullName: tester.full_name,
    qualifications: (tester.tester_qualifications ?? []).map((q) => ({
      categoryId: q.category_id,
      active: q.active,
    })),
    personalCaces: (tester.tester_personal_caces ?? []).map((c) => ({
      categoryId: c.category_id,
      issuerSiret: c.issuer_siret,
      expiresOn: c.expires_on,
    })),
  };

  return [
    ...checkTesterAssignment({
      tester: profile,
      candidate: {
        fullName: `${candidate.first_name} ${candidate.last_name}`,
        trainerTesterId: candidate.trainer_tester_id,
        trainerName: candidate.trainer_name,
      },
      categoryId: request.categoryId,
      categoryLabel,
      testDate: request.testDate,
      organizationSiret: request.organizationSiret,
    }),
    ...checkEquipment(
      {
        name: equipment.name,
        serialNumber: equipment.serial_number,
        categoryId: equipment.category_id,
        lastInspectionOn: equipment.last_inspection_on,
      },
      request.categoryId,
      categoryLabel,
      request.testDate,
    ),
  ];
}
