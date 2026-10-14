import { getLocale, getTranslations } from "next-intl/server";

/**
 * First focusable element on every page. It lives outside the header on
 * purpose: the header waits for the session, and a keyboard user should not
 * have to wait for that to reach "skip to content". It reads only the locale.
 */
export async function SkipLink() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Shell")]);
  return (
    <a
      href="#content"
      lang={locale}
      className="sr-only rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 print:hidden"
    >
      {t("skipToContent")}
    </a>
  );
}
