import type { SupabaseClient } from "@supabase/supabase-js";
import { detectFileType } from "@/lib/bills/upload-validation";
import { billToRow, eobLineToRow, lineItemToRow } from "@/lib/bills/rows";
import type { ExtractedBill } from "@/lib/types";
import { ExtractionError, type ExtractionErrorCode } from "./errors";
import type { ExtractionStore } from "./run";
import type { ExtractionFile } from "./types";

export const BILLS_BUCKET = "bills";

const CLAIM_REJECTIONS: Record<string, ExtractionErrorCode> = {
  unauthenticated: "unauthenticated",
  not_found: "not_found",
  busy: "busy",
  rate_limited: "rate_limited",
  already_done: "already_done",
};

/** Maps claim_extraction()'s text result to success or an ExtractionError. */
export function interpretClaim(result: unknown): void {
  if (result === "claimed") return;
  const code = typeof result === "string" ? CLAIM_REJECTIONS[result] : undefined;
  throw new ExtractionError(code ?? "claim_failed");
}

/** Maps finish_extraction()'s text result to success or an ExtractionError. */
export function interpretFinish(result: unknown): void {
  if (result === "finished") return;
  throw new ExtractionError("save_failed");
}

/**
 * Supabase-backed store. `supabase` must be the user-scoped client: every
 * read and write below is subject to the caller's RLS policies.
 */
export function createSupabaseExtractionStore(
  supabase: SupabaseClient,
  userId: string,
): ExtractionStore {
  return {
    async claim(billId) {
      const { data, error } = await supabase.rpc("claim_extraction", { p_bill_id: billId });
      if (error) throw new ExtractionError("claim_failed");
      interpretClaim(data);
    },

    async loadFiles(billId) {
      const { data, error } = await supabase
        .from("bill_files")
        .select("kind, storage_path")
        .eq("bill_id", billId);
      if (error) throw new ExtractionError("file_unreadable");

      const files: ExtractionFile[] = [];
      for (const row of data ?? []) {
        const download = await supabase.storage.from(BILLS_BUCKET).download(row.storage_path);
        if (download.error || !download.data) throw new ExtractionError("file_unreadable");
        const bytes = new Uint8Array(await download.data.arrayBuffer());
        // Trust the bytes, not the stored metadata.
        const mimeType = detectFileType(bytes);
        if (!mimeType || (row.kind !== "bill" && row.kind !== "eob")) {
          throw new ExtractionError("file_unreadable");
        }
        files.push({ kind: row.kind, mimeType, bytes });
      }
      return files;
    },

    async saveResult(billId, bill: ExtractedBill, { includeEob }) {
      // A retry starts from a clean slate; claim() refuses finished bills.
      for (const table of ["line_items", "eob_lines"]) {
        const { error } = await supabase.from(table).delete().eq("bill_id", billId);
        if (error) throw new ExtractionError("save_failed");
      }

      const ctx = (index: number) => ({ userId, billId, index });
      const lineRows = bill.lineItems.map((item, i) => lineItemToRow(item, ctx(i)));
      if (lineRows.length > 0) {
        const { error } = await supabase.from("line_items").insert(lineRows);
        if (error) throw new ExtractionError("save_failed");
      }

      if (includeEob && bill.eobLines.length > 0) {
        const eobRows = bill.eobLines.map((line, i) => eobLineToRow(line, ctx(i)));
        const { error } = await supabase.from("eob_lines").insert(eobRows);
        if (error) throw new ExtractionError("save_failed");
      }

      // Extraction status columns are not writable by the client; the status
      // change goes through finish_extraction() after the data is in place.
      const { error } = await supabase.from("bills").update(billToRow(bill)).eq("id", billId);
      if (error) throw new ExtractionError("save_failed");

      const finished = await supabase.rpc("finish_extraction", {
        p_bill_id: billId,
        p_status: "needs_review",
        p_error_code: null,
      });
      if (finished.error) throw new ExtractionError("save_failed");
      interpretFinish(finished.data);
    },

    async markFailed(billId, code) {
      const { data, error } = await supabase.rpc("finish_extraction", {
        p_bill_id: billId,
        p_status: "failed",
        p_error_code: code,
      });
      if (error) throw new ExtractionError("save_failed");
      interpretFinish(data);
    },
  };
}
