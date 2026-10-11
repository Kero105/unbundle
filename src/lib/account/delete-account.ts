import { deleteAllBills, type AccountDataStore } from "./delete-data";

export interface DeleteAccountDeps {
  store: AccountDataStore;
  /** Removes the sign-in account. Needs the service role; see ./admin.ts. */
  removeAuthUser(userId: string): Promise<void>;
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: "data_failed" | "auth_failed" };

/**
 * Data first, account second. If any data could not be removed the sign-in
 * account is left alone, so the user can sign in and try again rather than
 * losing access to data that is still stored.
 */
export async function deleteAccount(
  deps: DeleteAccountDeps,
  userId: string,
): Promise<DeleteAccountResult> {
  const data = await deleteAllBills(deps.store);
  if (!data.ok) return { ok: false, reason: "data_failed" };
  try {
    await deps.removeAuthUser(userId);
  } catch {
    return { ok: false, reason: "auth_failed" };
  }
  return { ok: true };
}
