import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ExtractedBillSchema, type ExtractedBill } from "@/lib/types";
import { BILL_COLUMNS, EOB_LINE_COLUMNS, LINE_ITEM_COLUMNS, rowsToBill } from "./rows";
import demoBill from "../../../fixtures/review/demo-bill.json";

/**
 * Data-access boundary for the review screen. Callers only ever see a
 * validated ExtractedBill or null.
 *
 * "demo" is served from the bundled synthetic fixture. Any other id is read
 * through the user-scoped Supabase client, so RLS decides what exists: a bill
 * that is not the caller's is indistinguishable from one that does not exist.
 * Bills still being read, or whose extraction failed, are not reviewable.
 */
const FIXTURES: Record<string, unknown> = {
  demo: demoBill,
};

export async function getBillForReview(id: string): Promise<ExtractedBill | null> {
  if (Object.hasOwn(FIXTURES, id)) return ExtractedBillSchema.parse(FIXTURES[id]);
  if (!z.uuid().safeParse(id).success) return null;

  const supabase = await createClient();

  const { data: bill, error } = await supabase
    .from("bills")
    .select(BILL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("bill_query_failed");
  if (!bill || bill.extraction_status !== "needs_review") return null;

  const [items, eob] = await Promise.all([
    supabase
      .from("line_items")
      .select(LINE_ITEM_COLUMNS)
      .eq("bill_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("eob_lines")
      .select(EOB_LINE_COLUMNS)
      .eq("bill_id", id)
      .order("sort_order")
      .order("created_at"),
  ]);
  if (items.error || eob.error) throw new Error("bill_query_failed");

  return rowsToBill(bill, items.data ?? [], eob.data ?? []);
}
