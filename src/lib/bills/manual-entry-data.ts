import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readEntryMethod } from "./entry-method";
import { displayStatus } from "./extraction-status";
import type { ManualBillInput } from "./manual-entry";
import { LINE_ITEM_COLUMNS, rowToLineItem } from "./rows";

export type ManualDraft = Pick<ManualBillInput, "header" | "lines">;

export type EntryLoad =
  /** Ready to type. `draft` is set when editing an earlier manual entry. */
  | { state: "ready"; draft: ManualDraft | null }
  /** An extracted bill that is already in review: nothing to type. */
  | { state: "reviewed" }
  /** A reading is still running. */
  | { state: "busy" };

/**
 * What the entry screen needs for an existing bill, read through the
 * user-scoped client (RLS decides what exists). Null when the id is not the
 * caller's.
 */
export async function getBillForEntry(id: string, now: number): Promise<EntryLoad | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();

  const { data: bill, error } = await supabase
    .from("bills")
    .select("extraction_status, extraction_started_at, provider_name, service_start, service_end")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("bill_query_failed");
  if (!bill) return null;

  const status = displayStatus(bill.extraction_status, bill.extraction_started_at, now);
  if (status === "extracting") return { state: "busy" };
  if (status !== "needs_review") return { state: "ready", draft: null };

  if ((await readEntryMethod(supabase, id)) !== "manual") return { state: "reviewed" };

  const { data: rows, error: rowsError } = await supabase
    .from("line_items")
    .select(LINE_ITEM_COLUMNS)
    .eq("bill_id", id)
    .order("sort_order")
    .order("created_at");
  if (rowsError) throw new Error("bill_query_failed");

  return {
    state: "ready",
    draft: {
      header: {
        providerName: bill.provider_name ?? "",
        serviceStart: bill.service_start,
        serviceEnd: bill.service_end,
      },
      lines: (rows ?? []).map((row) => {
        const item = rowToLineItem(row);
        return {
          dateOfService: item.dateOfService,
          code: item.code,
          descriptionRaw: item.descriptionRaw,
          modifiers: item.modifiers,
          units: item.units,
          unitPriceCents: item.unitPriceCents,
          chargeCents: item.chargeCents,
        };
      }),
    },
  };
}
