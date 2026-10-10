import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BILLS_PER_USER = 50;

/** Creates an empty bill owned by the caller; files are added by the next request. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { count, error: countError } = await supabase
    .from("bills")
    .select("id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: "create_failed" }, { status: 500 });
  if ((count ?? 0) >= MAX_BILLS_PER_USER) {
    return NextResponse.json({ error: "too_many_bills" }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("bills")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: "create_failed" }, { status: 500 });

  return NextResponse.json({ billId: data.id }, { status: 201 });
}
