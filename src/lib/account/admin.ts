import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Removes a user from Supabase Auth. This is the one place the service role
 * key is used for accounts, because only the admin API can delete an auth
 * user. It is imported only by the account-deletion server action, which
 * re-checks the signed-in user and passes that user's own id. The client is
 * created per call and never exported or returned.
 */
export async function deleteAuthUser(userId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("admin_unavailable");

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error("auth_delete_failed");
}
