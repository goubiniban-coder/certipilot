import "server-only";
import { addMonths, renewalsDue, RENEWAL_HORIZON_MONTHS, type IsoDate, type RenewalGroup } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";
import type { SessionStatus } from "@/lib/types";

export interface UpcomingSession {
  id: string;
  name: string;
  startsOn: IsoDate;
  endsOn: IsoDate;
  location: string;
  status: SessionStatus;
  candidates: number;
}

export interface RenewalCertificate {
  certificateId: string;
  clientCompanyId: string | null;
  clientCompanyName: string | null;
  expiresOn: IsoDate;
  revoked: boolean;
  number: string;
  holderName: string;
  recommendationCode: string;
}

export interface DashboardData {
  upcomingSessions: UpcomingSession[];
  issuedThisMonth: number;
  issuedThisYear: number;
  validCertificates: number;
  renewals: RenewalGroup<RenewalCertificate>[];
}

type SessionRow = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  location: string;
  status: SessionStatus;
  session_candidates: { count: number }[];
};

type CertificateRow = {
  id: string;
  number: string;
  holder_last_name: string;
  holder_first_name: string;
  recommendation_code: string;
  expires_on: string;
  revoked_at: string | null;
  candidates: { client_company_id: string | null; client_companies: { name: string } | null };
};

export async function getDashboardData(today: IsoDate): Promise<DashboardData> {
  const supabase = await createClient();
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const horizon = addMonths(today, RENEWAL_HORIZON_MONTHS);
  const count = { count: "exact", head: true } as const;

  const [sessions, month, year, valid, expiring] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, starts_on, ends_on, location, status, session_candidates(count)")
      .gte("ends_on", today)
      .order("starts_on")
      .limit(8)
      .returns<SessionRow[]>(),
    supabase.from("certificates").select("id", count).gte("issued_on", monthStart),
    supabase.from("certificates").select("id", count).gte("issued_on", yearStart),
    supabase.from("certificates").select("id", count).is("revoked_at", null).gte("expires_on", today),
    supabase
      .from("certificates")
      .select("id, number, holder_last_name, holder_first_name, recommendation_code, expires_on, revoked_at, candidates(client_company_id, client_companies(name))")
      .is("revoked_at", null)
      .gte("expires_on", today)
      .lte("expires_on", horizon)
      .order("expires_on")
      .returns<CertificateRow[]>(),
  ]);

  const renewals = renewalsDue<RenewalCertificate>(
    (expiring.data ?? []).map((c) => ({
      certificateId: c.id,
      clientCompanyId: c.candidates.client_company_id,
      clientCompanyName: c.candidates.client_companies?.name ?? null,
      expiresOn: c.expires_on,
      revoked: c.revoked_at !== null,
      number: c.number,
      holderName: `${c.holder_last_name.toUpperCase()} ${c.holder_first_name}`,
      recommendationCode: c.recommendation_code,
    })),
    today,
  ).sort((a, b) =>
    (a.certificates[0]?.clientCompanyName ?? "~").localeCompare(b.certificates[0]?.clientCompanyName ?? "~", "fr"),
  );

  return {
    upcomingSessions: (sessions.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      startsOn: s.starts_on,
      endsOn: s.ends_on,
      location: s.location,
      status: s.status,
      candidates: s.session_candidates[0]?.count ?? 0,
    })),
    issuedThisMonth: month.count ?? 0,
    issuedThisYear: year.count ?? 0,
    validCertificates: valid.count ?? 0,
    renewals,
  };
}

export interface SetupProgress {
  testers: number;
  equipment: number;
  candidates: number;
  sessions: number;
  certificates: number;
}

/** How far a new organization is in its first setup (drives the "Pour démarrer" guide). */
export async function getSetupProgress(): Promise<SetupProgress> {
  const supabase = await createClient();
  const count = async (table: string) => {
    const { count: n } = await supabase.from(table).select("id", { count: "exact", head: true });
    return n ?? 0;
  };
  const [testers, equipment, candidates, sessions, certificates] = await Promise.all(
    ["testers", "equipment", "candidates", "sessions", "certificates"].map(count),
  );
  return { testers: testers!, equipment: equipment!, candidates: candidates!, sessions: sessions!, certificates: certificates! };
}
