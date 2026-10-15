"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A visible tooltip for an icon-only button: shows on hover and on keyboard
 * focus, and Escape dismisses it. The button keeps its own aria-label as its
 * accessible name; the tooltip is decoration, so it is hidden from assistive
 * tech. Desktop only (lg and up): at smaller widths the button shows its text.
 */
export function IconTip({
  label,
  align = "center",
  children,
}: {
  label: string;
  align?: "center" | "end";
  children: React.ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <span
      className="group/tip relative inline-flex"
      onKeyDown={(event) => {
        if (event.key === "Escape") setDismissed(true);
      }}
      onMouseLeave={() => setDismissed(false)}
      onBlur={() => setDismissed(false)}
    >
      {children}
      <span
        aria-hidden="true"
        data-dismissed={dismissed ? "" : undefined}
        className={cn(
          "pointer-events-none absolute bottom-full z-20 mb-1 hidden rounded-control bg-foreground px-2 py-1 text-meta whitespace-nowrap text-background opacity-0 transition-opacity motion-reduce:transition-none lg:block",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 data-dismissed:opacity-0!",
          align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}
