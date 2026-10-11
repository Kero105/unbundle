import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Shell")]);

  return (
    <footer lang={locale} className="mt-auto border-t bg-card text-[0.9375rem] print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
        <nav aria-label={t("footerNav")}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/about" className="font-medium underline underline-offset-4 hover:no-underline">
                {t("about")}
              </Link>
            </li>
            <li>
              <Link href="/help" className="font-medium underline underline-offset-4 hover:no-underline">
                {t("help")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="font-medium underline underline-offset-4 hover:no-underline">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="font-medium underline underline-offset-4 hover:no-underline">
                {t("terms")}
              </Link>
            </li>
          </ul>
        </nav>
        <p className="max-w-2xl text-muted-foreground">{t("promise")}</p>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Unbundle</span> · {t("notAdvice")}
        </p>
      </div>
    </footer>
  );
}
