import { cache } from "react";
import { getBillForReview } from "@/lib/bills/review-data";
import { runRules } from "@/lib/rules";
import { createSupabaseLookups } from "@/lib/rules/supabase-lookups";
import { createClient } from "@/lib/supabase/server";
import type { ExtractedBill, Finding } from "@/lib/types";

export type BillFindings = { bill: ExtractedBill; findings: Finding[] };

/**
 * The bill and its deterministic findings. Language-independent: callers apply
 * messages afterwards. `cache()` only de-duplicates within one request, so the
 * result can never cross users; the user-scoped Supabase client (and RLS)
 * decides what a request can read.
 */
export const getBillFindings = cache(async (id: string): Promise<BillFindings | null> => {
  const bill = await getBillForReview(id);
  if (!bill) return null;
  const supabase = await createClient();
  const findings = await runRules(bill, createSupabaseLookups(supabase));
  return { bill, findings };
});
