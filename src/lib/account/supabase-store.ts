import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseDeletionStore } from "@/lib/bills/supabase-delete";
import type { AccountDataStore } from "./delete-data";

const BILLS_BUCKET = "bills";
const PAGE = 1000;
const MAX_PAGES = 20;

/** User-scoped client only. `userId` is the caller's id from `auth.getUser()`. */
export function createSupabaseAccountStore(supabase: SupabaseClient, userId: string): AccountDataStore {
  return {
    ...createSupabaseDeletionStore(supabase),

    async listBillIds() {
      const ids: string[] = [];
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const { data, error } = await supabase
          .from("bills")
          .select("id")
          .order("created_at")
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw new Error("list_failed");
        const rows = data ?? [];
        ids.push(...rows.map((r) => r.id as string));
        if (rows.length < PAGE) break;
      }
      return ids;
    },

    async listStoredPaths() {
      const root = await supabase.storage.from(BILLS_BUCKET).list(userId, { limit: PAGE });
      if (root.error) throw new Error("list_failed");

      const paths: string[] = [];
      for (const entry of root.data ?? []) {
        if (entry.id !== null) {
          paths.push(`${userId}/${entry.name}`);
          continue;
        }
        // A folder (one per bill): list the files inside it.
        const inner = await supabase.storage
          .from(BILLS_BUCKET)
          .list(`${userId}/${entry.name}`, { limit: PAGE });
        if (inner.error) throw new Error("list_failed");
        for (const file of inner.data ?? []) {
          if (file.id !== null) paths.push(`${userId}/${entry.name}/${file.name}`);
        }
      }
      return paths;
    },
  };
}
