/**
 * The /demo walk-through: four tips, each tied to one page and one element on
 * it. Pure and in-memory: which tips were dismissed lives in component state
 * and is never written anywhere. Only synthetic sample data is on these pages.
 */

export const TIP_IDS = ["source", "finding", "letterLink", "preview"] as const;
export type TipId = (typeof TIP_IDS)[number];

export interface Tip {
  id: TipId;
  /** The demo page this tip belongs to. */
  path: string;
  /** Value of the `data-walkthrough` attribute on the element the tip points at. */
  target: "source" | "finding" | "letter" | "preview";
  /** Skipped for a sample bill with nothing flagged, where there is no finding or dispute letter. */
  needsFindings: boolean;
}

export const TIPS: readonly Tip[] = [
  { id: "source", path: "/demo/review", target: "source", needsFindings: false },
  { id: "finding", path: "/demo/report", target: "finding", needsFindings: true },
  { id: "letterLink", path: "/demo/report", target: "letter", needsFindings: true },
  { id: "preview", path: "/demo/letter", target: "preview", needsFindings: false },
];

/** The scenario with no findings; see src/lib/demo/scenarios.ts. */
export const CLEAN_SCENARIO = "clean";

/** Tips that apply to this sample, in walk-through order. */
export function applicableTips(scenario: string | null): Tip[] {
  const hasFindings = scenario !== CLEAN_SCENARIO;
  return TIPS.filter((tip) => hasFindings || !tip.needsFindings);
}

export interface TipState {
  tip: Tip;
  /** 1-based position among the applicable tips. */
  number: number;
  total: number;
}

/** The first undismissed tip for this page, or null when there is none. */
export function currentTip(
  pathname: string,
  scenario: string | null,
  dismissed: ReadonlySet<TipId>,
): TipState | null {
  const tips = applicableTips(scenario);
  const index = tips.findIndex((tip) => tip.path === pathname && !dismissed.has(tip.id));
  if (index === -1) return null;
  return { tip: tips[index], number: index + 1, total: tips.length };
}
