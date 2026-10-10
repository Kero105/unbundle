import type { LineItem } from "@/lib/types";

/**
 * Summary of how sure the extraction was, for the review screen. Reads only
 * the per-row confidence labels; it never inspects bill text.
 */
export type ExtractionConfidence = {
  rowCount: number;
  lowCount: number;
  /** True when at least half of the rows were read with low confidence. */
  low: boolean;
};

export function summarizeConfidence(items: readonly Pick<LineItem, "confidence">[]): ExtractionConfidence {
  const rowCount = items.length;
  const lowCount = items.filter((item) => item.confidence === "low").length;
  return { rowCount, lowCount, low: rowCount > 0 && lowCount * 2 >= rowCount };
}
