import "server-only";
import { createClient } from "@/lib/supabase/server";
import { expiryState, inspectionDueDate, type ExpiryState } from "@/lib/rules";

export interface ComplianceAlert {
  kind: "tester_caces" | "equipment";
  id: string;
  href: string;
  title: string;
  detail: string;
  dueOn: string;
  state: ExpiryState;
}

type CacesRow = {
  id: string;
  tester_id: string;
  expires_on: string;
  testers: { full_name: string; active: boolean };
  categories: { code: string; recommendations: { code: string } };
};

type EquipmentRow = {
  id: string;
  name: string;
  serial_number: string;
  last_inspection_on: string | null;
  categories: { code: string; recommendations: { code: string } };
};

/** Testers' CACES® and equipment inspections expired or expiring within 60 days. */
export async function getComplianceAlerts(today: string): Promise<ComplianceAlert[]> {
  const supabase = await createClient();
  const [{ data: caces }, { data: equipment }] = await Promise.all([
    supabase
      .from("tester_personal_caces")
      .select("id, tester_id, expires_on, testers!inner(full_name, active), categories(code, recommendations(code))")
      .eq("testers.active", true),
    supabase
      .from("equipment")
      .select("id, name, serial_number, last_inspection_on, categories(code, recommendations(code))")
      .eq("active", true),
  ]);

  const alerts: ComplianceAlert[] = [];
  for (const row of (caces as CacesRow[] | null) ?? []) {
    const state = expiryState(row.expires_on, today, { inclusive: true });
    if (state.level === "ok") continue;
    alerts.push({
      kind: "tester_caces",
      id: row.id,
      href: `/app/testeurs/${row.tester_id}`,
      title: `CACES® de ${row.testers.full_name}`,
      detail: `${row.categories.recommendations.code} cat. ${row.categories.code}`,
      dueOn: row.expires_on,
      state,
    });
  }
  for (const row of (equipment as EquipmentRow[] | null) ?? []) {
    const dueOn = row.last_inspection_on ? inspectionDueDate(row.last_inspection_on) : today;
    const state = row.last_inspection_on
      ? expiryState(dueOn, today)
      : ({ level: "expired", daysLeft: 0 } as const);
    if (state.level === "ok") continue;
    alerts.push({
      kind: "equipment",
      id: row.id,
      href: "/app/engins",
      title: `Vérification de ${row.name}`,
      detail: `n° ${row.serial_number} · ${row.categories.recommendations.code} cat. ${row.categories.code}`,
      dueOn,
      state,
    });
  }
  return alerts.sort((a, b) => a.state.daysLeft - b.state.daysLeft);
}
