import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface CategoryOption {
  id: string;
  code: string;
  label: string;
  recommendationId: string;
  recommendationCode: string;
  /** "R.489 cat. 3" */
  shortLabel: string;
}

type Row = {
  id: string;
  code: string;
  label: string;
  active: boolean;
  recommendation_id: string;
  recommendations: { code: string };
};

/** Active categories of the organization, sorted by recommendation then code. */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, code, label, active, recommendation_id, recommendations(code)")
    .eq("active", true);
  return ((data as Row[] | null) ?? [])
    .map((row) => ({
      id: row.id,
      code: row.code,
      label: row.label,
      recommendationId: row.recommendation_id,
      recommendationCode: row.recommendations.code,
      shortLabel: `${row.recommendations.code} cat. ${row.code}`,
    }))
    .sort((a, b) =>
      a.recommendationCode === b.recommendationCode
        ? a.code.localeCompare(b.code, "fr", { numeric: true })
        : a.recommendationCode.localeCompare(b.recommendationCode),
    );
}
