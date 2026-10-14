"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentTip, type TipId } from "@/lib/demo/walkthrough";

export interface WalkthroughLabels {
  label: string;
  /** Contains {number} and {total}. */
  step: string;
  show: string;
  dismiss: string;
  pointed: string;
  tips: Record<TipId, { title: string; body: string }>;
}

/** First element for this target that is actually on screen (the review page has two source layouts). */
function findTarget(target: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-walkthrough="${target}"]`);
  return [...all].find((el) => el.getClientRects().length > 0) ?? null;
}

/** The page streams in behind the tip, so give a slow target a few seconds to arrive. */
async function waitForTarget(target: string, timeoutMs = 4000): Promise<HTMLElement | null> {
  const started = Date.now();
  for (;;) {
    const el = findTarget(target);
    if (el || Date.now() - started > timeoutMs) return el;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Dismissible tips for the sample bill. "Show me" scrolls to the element and
 * focuses it; the highlight is a CSS :focus style, so no attributes on
 * React-owned elements are touched here (their markup carries tabIndex={-1}).
 * State is in memory only: a full page reload brings the tips back, and
 * nothing is written to storage or sent.
 * It sits in the demo layout, so dismissals survive moving between demo pages.
 */
export function DemoWalkthroughClient({ labels }: { labels: WalkthroughLabels }) {
  const pathname = usePathname();
  const scenario = useSearchParams().get("scenario");
  const [dismissed, setDismissed] = useState<ReadonlySet<TipId>>(new Set());
  // The tip the status line is about, so a new tip or page starts without one.
  const [pointedAt, setPointedAt] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef(false);

  const state = currentTip(pathname, scenario, dismissed);
  const tipId = state?.tip.id;

  // After a dismissal, keep keyboard focus somewhere sensible: the next tip, or the content.
  useEffect(() => {
    if (!returnFocus.current) return;
    returnFocus.current = false;
    if (heading.current) heading.current.focus();
    else document.getElementById("content")?.focus();
  }, [tipId]);

  if (!state) return null;
  const { tip, number, total } = state;
  const copy = labels.tips[tip.id];
  const pointed = pointedAt === `${pathname}:${tip.id}`;

  async function show() {
    const el = await waitForTarget(tip.target);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
    setPointedAt(`${pathname}:${tip.id}`);
  }

  function dismiss() {
    returnFocus.current = true;
    setDismissed((prev) => new Set(prev).add(tip.id));
  }

  return (
    <aside
      aria-label={labels.label}
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
      className="border-b bg-card print:hidden"
    >
      <div className="mx-auto w-full max-w-[96rem] px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-primary bg-secondary/50 p-3 sm:p-4">
          <Lightbulb aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              {labels.step.replace("{number}", String(number)).replace("{total}", String(total))}
            </p>
            <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">
              {copy.title}
            </h2>
            <p className="text-base leading-7">{copy.body}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={show}>
                {labels.show}
              </Button>
              <span role="status" className="text-sm text-muted-foreground">
                {pointed ? labels.pointed : ""}
              </span>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={dismiss} aria-label={labels.dismiss}>
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
