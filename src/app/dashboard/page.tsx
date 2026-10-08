import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function UserEmail() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <p className="text-zinc-600 dark:text-zinc-400">
      Signed in as {user.email}
    </p>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense
        fallback={<p className="text-zinc-600 dark:text-zinc-400">&nbsp;</p>}
      >
        <UserEmail />
      </Suspense>
      <form action={signOut}>
        <button
          type="submit"
          className="h-10 rounded-full border border-black/[.12] px-5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.08]"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
