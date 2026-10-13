import type { SupabaseClient } from "@supabase/supabase-js";

export type EntryMethod = "extracted" | "manual";

/**
 * How a bill's rows got there. Read on its own, and failing safe to
 * "extracted", so the app keeps working against a database that has not had
 * migration 0006 applied yet (the column would not exist).
 */
export async function readEntryMethod(supabase: SupabaseClient, billId: string): Promise<EntryMethod> {
  try {
    const { data, error } = await supabase
      .from("bills")
      .select("entry_method")
      .eq("id", billId)
      .maybeSingle();
    if (error || !data) return "extracted";
    return data.entry_method === "manual" ? "manual" : "extracted";
  } catch {
    return "extracted";
  }
}
