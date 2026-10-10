/** Storage and database access for deleting a bill, injected for testing. */
export interface BillDeletionStore {
  /** Paths of the bill's stored files, read through RLS (empty if not the owner's). */
  listFilePaths(billId: string): Promise<string[]>;
  removeFiles(paths: string[]): Promise<void>;
  /** Deletes the bills row; line items, EOB lines, findings etc. cascade. Returns whether a row was removed. */
  deleteBillRow(billId: string): Promise<boolean>;
}

export type DeleteBillResult = { ok: true } | { ok: false; reason: "not_found" | "failed" };

/**
 * Removes a bill's stored files, then its rows. Files go first: if storage
 * fails the rows survive, so the user still sees the bill and can retry. The
 * reverse order could orphan private files that nothing references anymore.
 */
export async function deleteBill(store: BillDeletionStore, billId: string): Promise<DeleteBillResult> {
  try {
    const paths = await store.listFilePaths(billId);
    if (paths.length > 0) await store.removeFiles(paths);
    const removed = await store.deleteBillRow(billId);
    return removed ? { ok: true } : { ok: false, reason: "not_found" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
