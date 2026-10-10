"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/error-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/locale";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const MESSAGES = { en: en.Error, es: es.Error };

function readLocale() {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return resolveLocale(cookie, navigator.language);
}

const subscribe = () => () => {};

// Error boundaries sit above the page's NextIntlClientProvider, so this
// component picks its strings from the message files directly. It renders
// before the boundary knows the request locale, hence the cookie lookup.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => "en" as const);
  const t = MESSAGES[locale];

  return (
    <div lang={locale} className="flex flex-1 flex-col">
      <ErrorState title={t.title} body={t.body}>
        <Button type="button" size="lg" onClick={() => retry()}>
          {t.retry}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t.home}
        </Link>
      </ErrorState>
    </div>
  );
}
