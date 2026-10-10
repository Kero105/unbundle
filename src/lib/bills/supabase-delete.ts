import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillDeletionStore } from "./delete";

const BILLS_BUCKET = "bills";

/** User-scoped client only: RLS decides which rows and objects are the caller's. */
export function createSupabaseDeletionStore(supabase: SupabaseClient): BillDeletionStore {
  return {
    async listFilePaths(billId) {
      const { data, error } = await supabase
        .from("bill_files")
        .select("storage_path")
        .eq("bill_id", billId);
      if (error) throw new Error("list_failed");
      return (data ?? []).map((row) => row.storage_path as string);
    },

    async removeFiles(paths) {
      const { error } = await supabase.storage.from(BILLS_BUCKET).remove(paths);
      if (error) throw new Error("remove_failed");
    },

    async deleteBillRow(billId) {
      const { data, error } = await supabase
        .from("bills")
        .delete()
        .eq("id", billId)
        .select("id");
      if (error) throw new Error("delete_failed");
      return (data?.length ?? 0) > 0;
    },
  };
}
