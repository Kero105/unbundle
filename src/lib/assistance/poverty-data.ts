import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { PovertyRow } from "./financial-assistance";

const RowSchema = z.object({
  guideline_year: z.number().int(),
  region: z.enum(["contiguous", "AK", "HI"]),
  household_size: z.number().int().min(1).max(8),
  poverty_line_cents: z.coerce.number().int().positive(),
  per_additional_person_cents: z.coerce.number().int().positive(),
});

export interface PovertyGuidelines {
  guidelineYear: number;
  rows: PovertyRow[];
}

/**
 * The newest contiguous-US poverty guidelines (California uses these), or null
 * when the table is empty or unreadable. Uses the signed-in user's Supabase
 * client; the table is readable by `authenticated` under RLS, so no service
 * role is involved. Errors are dropped rather than logged.
 */
export async function getPovertyGuidelines(): Promise<PovertyGuidelines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("poverty_guidelines")
    .select(
      "guideline_year, region, household_size, poverty_line_cents, per_additional_person_cents",
    )
    .eq("region", "contiguous")
    .order("guideline_year", { ascending: false })
    .limit(8);
  if (error || !data) return null;

  const parsed = z.array(RowSchema).safeParse(data);
  if (!parsed.success || parsed.data.length === 0) return null;

  // Rows come newest-year first; keep only the newest year's complete set.
  const guidelineYear = parsed.data[0].guideline_year;
  const rows = parsed.data
    .filter((r) => r.guideline_year === guidelineYear)
    .map((r) => ({
      guidelineYear: r.guideline_year,
      region: r.region,
      householdSize: r.household_size,
      povertyLineCents: r.poverty_line_cents,
      perAdditionalPersonCents: r.per_additional_person_cents,
    }));
  return { guidelineYear, rows };
}
