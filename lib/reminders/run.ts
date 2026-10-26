import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { toIsoDate } from "@/lib/rules";
import { dueMilestone, type Milestone } from "./due";
import { brevoConfigured, sendEmail } from "./email";
import { reminderEmail } from "./message";

export interface ReminderRun {
  configured: boolean;
  checked: number;
  sent: number;
  skippedNoEmail: number;
  failed: number;
}

/** Daily job: e-mails the candidate and the client company for certificates nearing expiry. */
export async function sendRenewalReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { configured: brevoConfigured(), checked: 0, sent: 0, skippedNoEmail: 0, failed: 0 };
  if (!run.configured) return run;

  const db = createAdminClient();
  const today = toIsoDate(now);
  const horizon = toIsoDate(new Date(now.getTime() + 181 * 86_400_000));

  const { data: certs } = await db
    .from("certificates")
    .select("id, organization_id, candidate_id, holder_first_name, holder_last_name, recommendation_label, expires_on, revoked_at")
    .gte("expires_on", today)
    .lte("expires_on", horizon)
    .is("revoked_at", null);
  if (!certs?.length) return run;
  run.checked = certs.length;

  const ids = certs.map((c) => c.id);
  const [{ data: sent }, { data: candidates }, { data: orgs }] = await Promise.all([
    db.from("renewal_reminders").select("certificate_id, milestone").in("certificate_id", ids),
    db.from("candidates").select("id, email, client_company_id").in("id", [...new Set(certs.map((c) => c.candidate_id))]),
    db.from("organizations").select("id, name").in("id", [...new Set(certs.map((c) => c.organization_id))]),
  ]);
  const companyIds = [...new Set((candidates ?? []).map((c) => c.client_company_id).filter((v): v is string => !!v))];
  const { data: companies } = companyIds.length
    ? await db.from("client_companies").select("id, contact_email").in("id", companyIds)
    : { data: [] as { id: string; contact_email: string | null }[] };

  const sentBy = new Map<string, Set<Milestone>>();
  for (const r of sent ?? []) {
    const set = sentBy.get(r.certificate_id) ?? new Set<Milestone>();
    set.add(r.milestone as Milestone);
    sentBy.set(r.certificate_id, set);
  }
  const candidateById = new Map((candidates ?? []).map((c) => [c.id, c]));
  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name as string]));

  for (const cert of certs) {
    const milestone = dueMilestone(
      { certificateId: cert.id, expiresOn: cert.expires_on, revoked: !!cert.revoked_at },
      sentBy.get(cert.id) ?? new Set(),
      today,
    );
    if (!milestone) continue;
    const candidate = candidateById.get(cert.candidate_id);
    const company = candidate?.client_company_id ? companyById.get(candidate.client_company_id) : undefined;
    const to = [...new Set([candidate?.email, company?.contact_email].filter((v): v is string => !!v))];
    if (!to.length) {
      run.skippedNoEmail++;
      continue;
    }
    const organizationName = orgName.get(cert.organization_id) ?? "Votre organisme testeur";
    const { subject, text } = reminderEmail({
      holderName: `${cert.holder_first_name} ${cert.holder_last_name}`,
      recommendationLabel: cert.recommendation_label,
      expiresOn: cert.expires_on,
      organizationName,
      milestone,
    });
    try {
      await sendEmail({ to, subject, text, senderName: organizationName });
      await db.from("renewal_reminders").insert({
        organization_id: cert.organization_id,
        certificate_id: cert.id,
        milestone,
        recipients: to,
      });
      run.sent++;
    } catch {
      run.failed++;
    }
  }
  return run;
}
