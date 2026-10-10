import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function Dashboard() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Dashboard")]);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16"
    >
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("signedInAs", { email: user.email ?? "" })}</p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          {t("signOut")}
        </Button>
      </form>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16"
    >
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-7 w-72" />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
