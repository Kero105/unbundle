import { deleteBill, type BillDeletionStore } from "@/lib/bills/delete";

/**
 * Everything "delete all my bills" needs, injected so it can be tested without
 * a database. Reads and deletes go through the user-scoped client, so only the
 * caller's own rows and objects are ever visible here.
 */
export interface AccountDataStore extends BillDeletionStore {
  /** Ids of every bill the caller can see. */
  listBillIds(): Promise<string[]>;
  /** Object paths still under the caller's storage folder, including any no row points at. */
  listStoredPaths(): Promise<string[]>;
}

export type DeleteAllResult =
  | { ok: true; bills: number }
  | { ok: false; reason: "failed"; remaining: number };

/**
 * Deletes every bill with the same per-bill logic as the single-bill delete
 * (files first, then rows), then sweeps any leftover files in the user's
 * folder. A bill that is already gone counts as deleted. Stops short of
 * reporting success if anything could not be removed, so the account step
 * never runs on top of data that is still there.
 */
export async function deleteAllBills(store: AccountDataStore): Promise<DeleteAllResult> {
  let deleted = 0;
  let failures = 0;
  try {
    for (const id of await store.listBillIds()) {
      const result = await deleteBill(store, id);
      if (result.ok || result.reason === "not_found") deleted += 1;
      else failures += 1;
    }

    const leftovers = await store.listStoredPaths();
    if (leftovers.length > 0) await store.removeFiles(leftovers);
  } catch {
    return { ok: false, reason: "failed", remaining: Math.max(failures, 1) };
  }
  return failures === 0 ? { ok: true, bills: deleted } : { ok: false, reason: "failed", remaining: failures };
}
