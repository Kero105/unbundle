"use client";

import { useSyncExternalStore } from "react";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import "./globals.css";

const MESSAGES = { en: en.Error, es: es.Error };

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
    <html lang={locale} className="h-full">
      <body className="flex min-h-full flex-col font-sans">
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
      </body>
    </html>
  );
}
