import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/locale";
import { ExplanationTextSchema } from "./validate";

/**
 * Writes one validated explanation into the shared `code_explanations` cache.
 * The table holds no user data and has no insert/update policy for clients, so
 * the service role is the only way in. This is the single place in the app
 * that uses that key for explanations: it is server-only, only ever called
 * after a validated model answer for a code with no bill text in the prompt,
 * and it writes just (code, language, text).
 */
export async function writeExplanationToCache(code: string, language: Locale, text: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const valid = ExplanationTextSchema.safeParse(text);
  if (!valid.success) return;

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await admin
    .from("code_explanations")
    .upsert({ code, language, text: valid.data }, { onConflict: "code,language", ignoreDuplicates: true });
}
