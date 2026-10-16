import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { LanguageToggle } from "@/components/language-toggle";
import { SignInButton } from "@/components/sign-in-button";
import { createClient } from "@/lib/supabase/server";
import { isSignedIn } from "@/lib/supabase/signed-in";
import type { Locale } from "@/i18n/locale";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const NAV = [
  { href: "/methodology", key: "navMethodology" },
  { href: "/rights", key: "navRights" },
  { href: "/demo", key: "navTrySample" },
] as const;

const navLinkClass =
  "inline-flex min-h-11 items-center text-[0.8125rem] leading-tight font-medium underline-offset-4 hover:underline sm:text-[0.9375rem]";

export function Wordmark() {
  return (
    <span className="font-heading text-xl font-semibold tracking-tight text-primary max-[360px]:text-lg sm:text-2xl">
      Unbundle
    </span>
  );
}

/** Pre-hydration header: wordmark only, so the layout doesn't jump. */
export function SiteHeaderFallback() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:h-16 sm:px-6">
        <Wordmark />
      </div>
      {/* Reserves the nav row (below lg) so the page doesn't jump when the header streams in. */}
      <div aria-hidden="true" className="h-11 lg:hidden" />
    </header>
  );
}

export async function SiteHeader() {
  await connection();
  const [locale, t, signedIn] = await Promise.all([
    getLocale() as Promise<Locale>,
    getTranslations("Shell"),
    isSignedIn(),
  ]);

  return (
    <header lang={locale} className="border-b bg-background print:hidden">
      <HtmlLangSync locale={locale} />
      {/* One row from lg up (wordmark, links, sign in, language). Below lg the
          wordmark, sign in and language sit in the top row and the links drop
          to a single second row, so every link stays visible down to 320px. */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 px-4 sm:gap-x-6 sm:px-6 lg:flex-nowrap">
        <Link
          href="/"
          aria-label={t("homeLabel")}
          className="order-1 flex min-h-14 items-center rounded-md focus-visible:outline-offset-4 sm:min-h-16"
        >
          <Wordmark />
        </Link>
        <nav
          aria-label={t("navLabel")}
          className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1"
        >
          <ul className="flex items-center justify-between gap-x-2 sm:justify-start sm:gap-x-5">
            {NAV.map(({ href, key }) => (
              <li key={href} className="min-w-0">
                <Link href={href} className={navLinkClass}>
                  {t(key)}
                </Link>
              </li>
            ))}
            {signedIn ? (
              <li>
                <Link href="/dashboard" className={navLinkClass}>
                  {t("navDashboard")}
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
        <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2 lg:order-3 lg:ml-0">
          {signedIn ? null : (
            <SignInButton size="sm" variant="secondary" className="max-sm:px-2 max-sm:text-[0.8125rem]">
              {t("navSignIn")}
            </SignInButton>
          )}
          <LanguageToggle
            locale={locale}
            groupLabel={t("languageLabel")}
            options={[
              { value: "en", short: "EN", name: t("languageEnglish") },
              { value: "es", short: "ES", name: t("languageSpanish") },
            ]}
          />
          {signedIn ? (
            <Link
              href="/settings"
              title={t("settings")}
              className="inline-flex h-11 items-center gap-2 rounded-control border border-input bg-card px-3 text-sm font-medium hover:bg-muted max-xl:w-11 max-xl:justify-center max-xl:px-0"
            >
              <Settings aria-hidden="true" className="size-4" />
              <span className="max-xl:sr-only">{t("settings")}</span>
            </Link>
          ) : null}
          {signedIn ? (
            <form action={signOut}>
              <Button
                type="submit"
                variant="secondary"
                title={t("signOut")}
                className="max-xl:w-11 max-xl:px-0"
              >
                <LogOut aria-hidden="true" />
                <span className="max-xl:sr-only">{t("signOut")}</span>
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
