import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow same-site relative redirects.
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";

  // Provider errors (denied consent, expired link) and a missing code land on
  // a friendly page with a retry. Query values are never echoed or logged.
  if (code && !searchParams.has("error")) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    } catch {
      // Fall through to the error page.
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
