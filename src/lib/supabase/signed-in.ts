import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether the request has a signed-in user, for UI state only (which button to
 * show). Never gates data: pages and actions still check the user themselves.
 * Callers must `await connection()` first so the session read is request-time.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user !== null;
  } catch {
    return false;
  }
}
