"use client";

import { useSyncExternalStore } from "react";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const MESSAGES = {
  en: { ...en.Error, skip: en.Shell.skipToContent },
  es: { ...es.Error, skip: es.Shell.skipToContent },
};

function readLocale() {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return resolveLocale(cookie, navigator.language);
}

const subscribe = () => () => {};

/**
 * Last-resort boundary for errors in the root layout itself, which `error.tsx`
 * cannot catch. It replaces the layout, so it renders its own <html> and
 * <body>. The theme comes from globals.css; fonts fall back to the system's.
 * No provider exists here, so strings come straight from the message files.
 */
export default function GlobalRootError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => "en" as const);
  const t = MESSAGES[locale];

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#content"
          className="sr-only rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          {t.skip}
        </a>
        <div id="content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          <ErrorState title={t.title} body={t.body}>
            <Button type="button" size="lg" onClick={() => retry()}>
              {t.retry}
            </Button>
            {/* A plain anchor on purpose: a full reload clears whatever broke the layout. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-6 text-base font-medium hover:bg-muted"
            >
              {t.home}
            </a>
          </ErrorState>
        </div>
      </body>
    </html>
  );
}
