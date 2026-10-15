import "server-only";
import { getCurrentUser } from "@/lib/supabase/current-user";

/**
 * Whether the request has a signed-in user, for UI state only (which button to
 * show). Never gates data: pages and actions still check the user themselves.
 * Callers must `await connection()` first so the session read is request-time.
 */
export async function isSignedIn(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
