"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/locale";

/**
 * Keeps <html lang> in step with the request locale.
 *
 * The root layout cannot read the locale itself: doing so would make the whole
 * document shell request-time data and defeat Partial Prerendering. So the
 * static shell says lang="en", and this component, rendered from the
 * Suspense-wrapped header, corrects it as soon as the locale is known. Page
 * content also carries its own `lang`, so assistive technology reads each
 * region in the right language even before this runs.
 */
export function HtmlLangSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
