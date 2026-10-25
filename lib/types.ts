/** Row types of the tables used by the application (see supabase/migrations). */

export type AppRole = "admin" | "secretariat" | "tester";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Responsable du centre",
  secretariat: "Secrétariat",
  tester: "Testeur",
};

export interface Organization {
  id: string;
  name: string;
  siret: string;
  certificate_prefix: string;
  retention_months: number;
}

export interface Profile {
  id: string;
  organization_id: string;
  role: AppRole;
  full_name: string;
  email: string;
  active: boolean;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: AppRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Recommendation {
  id: string;
  code: string;
  label: string;
  validity_years: number;
  theory_pass_percent: number;
  requires_ipr: boolean;
}

export interface Category {
  id: string;
  recommendation_id: string;
  code: string;
  label: string;
  validity_years: number | null;
  practical_duration_minutes: number | null;
  active: boolean;
}

export interface Grid {
  id: string;
  category_id: string;
  name: string;
  version: number;
  is_active: boolean;
  is_example: boolean;
  pass_score: number;
  notes: string | null;
}

export interface GridItem {
  id: string;
  grid_id: string;
  position: number;
  label: string;
  description: string | null;
  max_points: number;
  eliminatory: boolean;
}
