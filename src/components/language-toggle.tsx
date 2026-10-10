"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { localeCookie, localeToSwitchTo, type Locale } from "@/i18n/locale";

type LanguageToggleProps = {
  locale: Locale;
  groupLabel: string;
  options: { value: Locale; short: string; name: string }[];
};

function persistLocale(locale: Locale) {
  document.cookie = localeCookie(locale);
  document.documentElement.lang = locale;
}

/**
 * EN | ES switch. Sets the NEXT_LOCALE cookie, then re-renders the page. The
 * new language shows as active at once (optimistic) while the server render is
 * in flight; the page dims and a thin bar runs so the click is acknowledged.
 */
export function LanguageToggle({ locale, groupLabel, options }: LanguageToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Reverts to the `locale` prop when the transition settles.
  const [shown, setShown] = useOptimistic(locale);

  // Page-level pending styles live in globals.css, keyed off this attribute.
  useEffect(() => {
    if (!pending) return;
    const root = document.documentElement;
    root.setAttribute("data-locale-pending", "");
    return () => root.removeAttribute("data-locale-pending");
  }, [pending]);

  function choose(requested: Locale) {
    const next = localeToSwitchTo(shown, requested);
    if (!next) return;
    startTransition(() => {
      setShown(next);
      persistLocale(next);
      router.refresh();
    });
  }

  return (
    <>
    {pending ? <div aria-hidden="true" className="locale-progress" /> : null}
    <div
      role="group"
      aria-label={groupLabel}
      aria-busy={pending}
      className="inline-flex items-center rounded-lg border border-input bg-card p-0.5"
    >
      {options.map((option) => {
        const active = option.value === shown;
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
                : "text-foreground hover:bg-muted active:bg-muted/60",
            )}
          >
            {option.short}
          </button>
        );
      })}
    </div>
    </>
  );
}
