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
import type { Locale } from "@/i18n/locale";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function isSignedIn() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user !== null;
  } catch {
    return false;
  }
}

const NAV = [
  { href: "/methodology", key: "navMethodology" },
  { href: "/rights", key: "navRights" },
  { href: "/demo", key: "navTrySample" },
] as const;

const navLinkClass =
  "inline-flex min-h-10 items-center text-[0.9375rem] font-medium underline-offset-4 hover:underline";

export function Wordmark() {
  return (
    <span className="font-heading text-2xl font-semibold tracking-tight text-primary">
      Unbundle
    </span>
  );
}

/** Pre-hydration header: wordmark only, so the layout doesn't jump. */
export function SiteHeaderFallback() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Wordmark />
      </div>
      {/* Reserves the nav row so the page doesn't jump when the header streams in. */}
      <div aria-hidden="true" className="h-12 border-t" />
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
      <a
        href="#content"
        className="sr-only rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t("homeLabel")}
          className="rounded-md focus-visible:outline-offset-4"
        >
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
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
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              <Settings aria-hidden="true" className="size-4" />
              <span className="max-sm:sr-only">{t("settings")}</span>
            </Link>
          ) : null}
          {signedIn ? (
            <form action={signOut}>
              <Button type="submit" variant="outline">
                <LogOut aria-hidden="true" />
                <span className="max-sm:sr-only">{t("signOut")}</span>
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      <nav aria-label={t("navLabel")} className="border-t">
        {/* Wraps instead of scrolling, so four links fit a 320px screen. */}
        <ul className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1 sm:px-6">
          {NAV.map(({ href, key }) => (
            <li key={href}>
              <Link href={href} className={navLinkClass}>
                {t(key)}
              </Link>
            </li>
          ))}
          <li>
            {signedIn ? (
              <Link href="/dashboard" className={navLinkClass}>
                {t("navDashboard")}
              </Link>
            ) : (
              <SignInButton size="sm" variant="ghost">
                {t("navSignIn")}
              </SignInButton>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}
