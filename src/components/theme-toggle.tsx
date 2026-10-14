"use client";

import { useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyThemeChoice,
  choiceFromAttribute,
  storeChoice,
  THEME_CHOICES,
  type ThemeChoice,
} from "@/lib/theme";

const ICONS: Record<ThemeChoice, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };
const CHANGED = "unbundle-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
}

// <html data-theme> is the source of truth: the pre-paint script sets it from
// storage before React runs, so there is nothing to read from storage here.
const currentChoice = () => choiceFromAttribute(document.documentElement.getAttribute("data-theme"));
const serverChoice = (): ThemeChoice => "system";

interface ThemeToggleProps {
  groupLabel: string;
  labels: Record<ThemeChoice, string>;
}

/**
 * System / Light / Dark. A labelled group of buttons, each reachable with Tab
 * and Space or Enter, with the current one marked by aria-pressed and a tick.
 */
export function ThemeToggle({ groupLabel, labels }: ThemeToggleProps) {
  const choice = useSyncExternalStore(subscribe, currentChoice, serverChoice);

  function choose(next: ThemeChoice) {
    applyThemeChoice(document.documentElement, next);
    // If storage is blocked the choice still holds for this visit.
    storeChoice(() => window.localStorage, next);
    window.dispatchEvent(new Event(CHANGED));
  }

  return (
    <div role="group" aria-label={groupLabel} className="inline-flex flex-wrap items-center gap-1">
      {THEME_CHOICES.map((value) => {
        const Icon = ICONS[value];
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => choose(value)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
              active
                ? "border-primary bg-secondary text-secondary-foreground"
                : "border-input bg-card text-foreground hover:bg-muted",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {labels[value]}
            {/* The chosen one carries a tick as well as a colour, so it never depends on colour alone. */}
            {active ? <Check aria-hidden="true" className="size-4" /> : null}
          </button>
        );
      })}
    </div>
  );
}
