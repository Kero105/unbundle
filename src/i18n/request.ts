import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locale";

// Both catalogs are imported statically, so they are loaded once with the
// server bundle and a language switch never waits on a module load.
const MESSAGES: Record<Locale, typeof en> = { en, es };

// No locale in the URL: the locale comes from a cookie, then Accept-Language.
// Reading either makes the caller dynamic, so render inside <Suspense>.
export default getRequestConfig(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );
  return { locale, messages: MESSAGES[locale] };
});
