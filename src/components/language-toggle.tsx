"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALE_COOKIE, type Locale } from "@/i18n/locale";

type LanguageToggleProps = {
  locale: Locale;
  groupLabel: string;
  options: { value: Locale; short: string; name: string }[];
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  document.documentElement.lang = locale;
}

/** EN | ES switch. Sets the NEXT_LOCALE cookie, then re-renders the page. */
export function LanguageToggle({ locale, groupLabel, options }: LanguageToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    persistLocale(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={groupLabel}
      aria-busy={pending}
      className="inline-flex items-center rounded-lg border border-input bg-card p-0.5"
    >
      {options.map((option) => {
        const active = option.value === locale;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-label={option.name}
            aria-pressed={active}
            onClick={() => choose(option.value)}
            className={cn(
              "inline-flex h-10 min-w-11 items-center justify-center rounded-md px-3 text-sm font-semibold tracking-wide transition-colors focus-visible:outline-offset-0",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
