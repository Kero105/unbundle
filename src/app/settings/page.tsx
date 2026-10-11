import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { routeMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/locale";
import { DangerZone } from "./danger-zone";

export const generateMetadata = () => routeMetadata("settings");

async function Settings() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [locale, t, shell] = await Promise.all([
    getLocale() as Promise<Locale>,
    getTranslations("Settings"),
    getTranslations("Shell"),
  ]);

  return (
    <NextIntlClientProvider>
      <main
        lang={locale}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12"
      >
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </header>

        <section aria-labelledby="account-title" className="flex flex-col gap-3">
          <h2 id="account-title" className="text-xl font-semibold">
            {t("account.title")}
          </h2>
          <dl>
            <dt className="text-sm font-medium text-muted-foreground">{t("account.email")}</dt>
            <dd className="mt-1 text-lg break-all">{user.email ?? t("account.noEmail")}</dd>
          </dl>
        </section>

        <section aria-labelledby="language-title" className="flex flex-col gap-3">
          <h2 id="language-title" className="text-xl font-semibold">
            {t("language.title")}
          </h2>
          <p className="max-w-2xl text-muted-foreground">{t("language.body")}</p>
          <div>
            <LanguageToggle
              locale={locale}
              groupLabel={shell("languageLabel")}
              options={[
                { value: "en", short: "EN", name: shell("languageEnglish") },
                { value: "es", short: "ES", name: shell("languageSpanish") },
              ]}
            />
          </div>
        </section>

        <section aria-labelledby="data-title" className="flex flex-col gap-4">
          <h2 id="data-title" className="text-xl font-semibold">
            {t("data.title")}
          </h2>
          <DangerZone />
        </section>
      </main>
    </NextIntlClientProvider>
  );
}

function SettingsSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-7 w-72" />
      <Skeleton className="h-32 w-full" />
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <Settings />
    </Suspense>
  );
}
