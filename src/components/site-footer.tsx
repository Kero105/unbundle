import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

const linkClass = "font-medium underline underline-offset-4 hover:no-underline";

const GROUPS = [
  {
    heading: "footerLearn",
    links: [
      { href: "/methodology", key: "navMethodology" },
      { href: "/rights", key: "navRights" },
      { href: "/glossary", key: "footerGlossary" },
      { href: "/faq", key: "footerFaq" },
      { href: "/share", key: "footerShare" },
    ],
  },
  {
    heading: "footerTools",
    links: [
      { href: "/rights/check", key: "footerCheck" },
      { href: "/checklist", key: "footerChecklist" },
      { href: "/demo", key: "navTrySample" },
      { href: "/help", key: "help" },
    ],
  },
  {
    heading: "footerAbout",
    links: [
      { href: "/about", key: "about" },
      { href: "/privacy", key: "privacy" },
      { href: "/terms", key: "terms" },
    ],
  },
] as const;

export async function SiteFooter() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Shell")]);

  return (
    <footer lang={locale} className="mt-auto border-t bg-card text-[0.9375rem] print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <nav aria-label={t("footerNav")}>
          <div className="grid gap-6 sm:grid-cols-3">
            {GROUPS.map(({ heading, links }) => (
              <section key={heading}>
                <h2 className="text-sm font-semibold text-muted-foreground">{t(heading)}</h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {links.map(({ href, key }) => (
                    <li key={href}>
                      <Link href={href} className={`${linkClass} inline-flex min-h-8 items-center`}>
                        {t(key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </nav>
        <p className="max-w-2xl text-muted-foreground">{t("promise")}</p>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Unbundle</span> · {t("notAdvice")}
        </p>
      </div>
    </footer>
  );
}
