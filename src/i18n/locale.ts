export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

function asLocale(tag: string): Locale | null {
  const primary = tag.trim().toLowerCase().split("-")[0];
  return (locales as readonly string[]).includes(primary) ? (primary as Locale) : null;
}

/**
 * Pick a supported locale: an explicit cookie wins, then the first supported
 * language in the Accept-Language header (in the order the browser listed
 * them), then the default.
 */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (cookieValue) {
    const fromCookie = asLocale(cookieValue);
    if (fromCookie) return fromCookie;
  }
  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(",")
      .map((part, index) => {
        const [tag, ...params] = part.split(";");
        const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
        const weight = q ? Number(q.slice(2)) : 1;
        return { tag, weight: Number.isFinite(weight) ? weight : 0, index };
      })
      .filter((entry) => entry.weight > 0)
      .sort((a, b) => b.weight - a.weight || a.index - b.index);
    for (const { tag } of ranked) {
      const match = asLocale(tag);
      if (match) return match;
    }
  }
  return defaultLocale;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The `document.cookie` assignment that persists an explicit locale choice. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/**
 * The locale a toggle click should switch to, or null when the click is a
 * no-op (already active, or not a supported locale).
 */
export function localeToSwitchTo(current: Locale, requested: string): Locale | null {
  if (requested === current) return null;
  return (locales as readonly string[]).includes(requested) ? (requested as Locale) : null;
}
