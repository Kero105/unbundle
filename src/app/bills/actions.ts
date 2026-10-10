"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteBill } from "@/lib/bills/delete";
import { LineItemPatchSchema, patchToRow } from "@/lib/bills/line-item-patch";
import { createSupabaseDeletionStore } from "@/lib/bills/supabase-delete";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const IdSchema = z.uuid();

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

/** Deletes the bill's rows and its stored files. */
export async function deleteBillAction(billId: string): Promise<ActionResult> {
  if (!IdSchema.safeParse(billId).success) return { ok: false, error: "not_found" };
  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };

  const result = await deleteBill(createSupabaseDeletionStore(session.supabase), billId);
  if (!result.ok) return { ok: false, error: result.reason };

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Saves one edited line item. Validated, user-scoped, and RLS-checked. */
export async function updateLineItemAction(
  billId: string,
  itemId: string,
  patch: unknown,
): Promise<ActionResult> {
  if (!IdSchema.safeParse(billId).success || !IdSchema.safeParse(itemId).success) {
    return { ok: false, error: "not_found" };
  }
  const parsed = LineItemPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };

  const { data, error } = await session.supabase
    .from("line_items")
    .update(patchToRow(parsed.data))
    .eq("id", itemId)
    .eq("bill_id", billId)
    .select("id");
  if (error) return { ok: false, error: "save_failed" };
  if ((data?.length ?? 0) === 0) return { ok: false, error: "not_found" };

  return { ok: true };
}
