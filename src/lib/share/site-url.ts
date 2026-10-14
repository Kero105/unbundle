/**
 * The one public address /share offers. It comes from NEXT_PUBLIC_SITE_URL and
 * nothing else: if that is unset or not a web address there is no URL, and the
 * page says so instead of guessing one. Only the origin is kept, so a path,
 * query string or fragment (and with them any tracking parameter) is dropped.
 */
export function parseSiteUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === "") return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string | null {
  return parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}
