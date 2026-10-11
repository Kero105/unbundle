"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAccount } from "@/lib/account/delete-account";
import { deleteAllBills } from "@/lib/account/delete-data";
import { createSupabaseAccountStore } from "@/lib/account/supabase-store";
import { deleteAuthUser } from "@/lib/account/admin";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

/** Removes every bill, its rows and its stored files. The account stays. */
export async function deleteAllBillsAction(): Promise<SettingsActionResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };

  const result = await deleteAllBills(createSupabaseAccountStore(session.supabase, session.user.id));
  if (!result.ok) return { ok: false, error: "failed" };

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Removes all bills and files, then the sign-in account, then signs out. The
 * signed-in user is re-checked here and only that user's own id is passed to
 * the admin call; nothing the client sends is used to pick who is deleted.
 */
export async function deleteAccountAction(): Promise<SettingsActionResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };

  const result = await deleteAccount(
    {
      store: createSupabaseAccountStore(session.supabase, session.user.id),
      removeAuthUser: deleteAuthUser,
    },
    session.user.id,
  );
  if (!result.ok) return { ok: false, error: result.reason };

  // The session cookie is the only thing left; clear it locally.
  await session.supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/");
}
