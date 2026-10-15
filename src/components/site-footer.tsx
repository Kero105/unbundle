import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/theme-toggle";

const linkClass =
  "inline-flex min-h-11 items-center font-medium underline underline-offset-4 hover:no-underline";

// How it works, Know your rights and Try a sample live in the header, so they
// are not repeated here. Legal links come last.
const LINKS = [
  { href: "/glossary", key: "footerGlossary" },
  { href: "/faq", key: "footerFaq" },
  { href: "/checklist", key: "footerChecklist" },
  { href: "/rights/check", key: "footerCheck" },
  { href: "/help", key: "help" },
  { href: "/share", key: "footerShare" },
  { href: "/about", key: "about" },
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
] as const;

export async function SiteFooter() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Shell")]);

  return (
    <footer lang={locale} className="mt-auto border-t bg-card text-[0.9375rem] print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
        <nav aria-label={t("footerNav")}>
          <ul className="grid grid-cols-2 gap-x-6 sm:flex sm:flex-wrap">
            {LINKS.map(({ href, key }) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-xl flex-col gap-2 text-muted-foreground">
            <p>{t("promise")}</p>
            <p>
              <span className="font-semibold text-foreground">Unbundle</span> · {t("notAdvice")}
            </p>
          </div>
          <ThemeToggle
            groupLabel={t("themeLabel")}
            labels={{ system: t("themeSystem"), light: t("themeLight"), dark: t("themeDark") }}
          />
        </div>
      </div>
    </footer>
  );
}
