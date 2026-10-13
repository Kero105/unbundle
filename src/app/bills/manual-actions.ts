"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseManualStore } from "@/lib/bills/supabase-manual";
import { submitManualBill, type ManualSubmitResult } from "@/lib/bills/submit-manual";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves a hand-typed bill and moves it to review. Validated with Zod here and
 * again inside submit_manual_bill(); the status change happens only there.
 * Errors are opaque codes: nothing typed is echoed back or logged.
 */
export async function submitManualBillAction(input: unknown): Promise<ManualSubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const result = await submitManualBill({
    store: createSupabaseManualStore(supabase, user.id),
    input,
    today: new Date().toISOString().slice(0, 10),
  });

  if (result.ok) revalidatePath("/dashboard");
  return result;
}
