export const TIMELINE_STEPS = ["itemized", "review", "dispute", "followUp"] as const;
export type TimelineStep = (typeof TIMELINE_STEPS)[number];

/** Things worth asking along the way, from the older "What to do next" list. */
export const ALSO_ASK = ["assistance", "collections", "insurer"] as const;

export interface TimelineHrefs {
  /** The itemized-bill request letter. */
  itemized: string;
  /** The one-page summary of the findings. */
  summary: string;
  /** The dispute letter. Only meaningful when there are findings. */
  letter: string;
}

/**
 * Where each step of the timeline links. Every target already exists: a
 * letter, the summary, the rights guide or the checklist. With no findings
 * there is nothing to dispute, so that step points at the guide instead of
 * a letter that would be empty.
 */
export function timelineLinks(
  hrefs: TimelineHrefs,
  hasFindings: boolean,
): Record<TimelineStep, { href: string; linkKey: "link" | "linkNoFindings" }> {
  return {
    itemized: { href: hrefs.itemized, linkKey: "link" },
    review: { href: hrefs.summary, linkKey: "link" },
    dispute: hasFindings
      ? { href: hrefs.letter, linkKey: "link" }
      : { href: "/rights#itemized-title", linkKey: "linkNoFindings" },
    followUp: { href: "/checklist", linkKey: "link" },
  };
}
