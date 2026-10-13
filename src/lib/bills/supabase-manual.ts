import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManualSubmitStore } from "./submit-manual";

/** Supabase-backed store. `supabase` must be the user-scoped client. */
export function createSupabaseManualStore(
  supabase: SupabaseClient,
  userId: string,
): ManualSubmitStore {
  return {
    async countBills() {
      const { count, error } = await supabase
        .from("bills")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error("count_failed");
      return count ?? 0;
    },

    async createBill() {
      const { data, error } = await supabase
        .from("bills")
        .insert({ user_id: userId })
        .select("id")
        .single();
      if (error || !data) throw new Error("create_failed");
      return data.id as string;
    },

    async deleteBill(billId) {
      const { error } = await supabase.from("bills").delete().eq("id", billId).eq("user_id", userId);
      if (error) throw new Error("delete_failed");
    },

    async submit({ billId, header, lines }) {
      const { data, error } = await supabase.rpc("submit_manual_bill", {
        p_bill_id: billId,
        p_header: header,
        p_lines: lines,
      });
      if (error) throw new Error("rpc_failed");
      return data;
    },
  };
}
