import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export type MetaKey =
  | "home"
  | "demo"
  | "upload"
  | "manualEntry"
  | "dashboard"
  | "settings"
  | "review"
  | "report"
  | "letter"
  | "assistance"
  | "authError"
  | "privacy"
  | "terms"
  | "about"
  | "help"
  | "methodology"
  | "rights"
  | "rightsCheck"
  | "glossary"
  | "checklist"
  | "faq"
  | "share";

/** Title and description for a route, in the request locale. */
export async function routeMetadata(key: MetaKey): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t(`${key}.title`), description: t(`${key}.description`) };
}
