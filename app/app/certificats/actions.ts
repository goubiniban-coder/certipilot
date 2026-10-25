"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ensureCertificatePdf } from "@/lib/certificates/service";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";

const issueSchema = z.object({
  sessionId: z.string().uuid(),
  sessionCandidateId: z.string().uuid(),
  recommendationId: z.string().uuid(),
});

/** Issues the certificate (the database checks theory and practical results), then renders its PDF. */
export async function issueCertificate(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession(["admin", "secretariat"]);
  const parsed = issueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Demande invalide." };
  const { sessionId, sessionCandidateId, recommendationId } = parsed.data;

  const supabase = await createClient();
  const { data: certificateId, error } = await supabase.rpc("issue_certificate", {
    p_session_candidate_id: sessionCandidateId,
    p_recommendation_id: recommendationId,
  });
  if (error) return { message: dbErrorMessage(error) };

  try {
    await ensureCertificatePdf(certificateId as string);
  } catch {
    // The certificate exists; the PDF is rendered again on first download.
  }
  revalidatePath(`/app/sessions/${sessionId}`);
  revalidatePath("/app/certificats");
  redirect(`/app/certificats/${certificateId}`);
}

const revokeSchema = z.object({
  certificateId: z.string().uuid(),
  reason: z.string().trim().min(5, "Indiquez le motif de la révocation (5 caractères minimum)."),
});

export async function revokeCertificate(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession(["admin"]);
  const parsed = revokeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: { reason: parsed.error.issues.map((issue) => issue.message) } };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_certificate", {
    p_certificate_id: parsed.data.certificateId,
    p_reason: parsed.data.reason,
  });
  if (error) return { message: dbErrorMessage(error) };
  revalidatePath(`/app/certificats/${parsed.data.certificateId}`);
  revalidatePath("/app/certificats");
  return { ok: true, message: "Certificat révoqué. La page de vérification affiche désormais « Révoqué »." };
}
