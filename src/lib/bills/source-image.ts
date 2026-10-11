import type { SourceBox } from "@/lib/types";

/** Signed URLs for the original bill live this long. */
export const SOURCE_URL_TTL_SECONDS = 300;

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

export type CssBox = { left: string; top: string; width: string; height: string };

/**
 * Converts a normalized (0 to 1) box to CSS percentages, clamped so the
 * rectangle always stays inside the page. Returns null for a missing or
 * empty box, which callers show as "no highlight".
 */
export function boxToCss(box: SourceBox | null | undefined): CssBox | null {
  if (!box) return null;
  const x = clampUnit(box.x);
  const y = clampUnit(box.y);
  const width = Math.min(clampUnit(box.width), 1 - x);
  const height = Math.min(clampUnit(box.height), 1 - y);
  if (width <= 0 || height <= 0) return null;
  const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;
  return { left: pct(x), top: pct(y), width: pct(width), height: pct(height) };
}

/** Whether a highlight for a row on `sourcePage` belongs on the page being shown. */
export function boxAppliesToPage(sourcePage: number, shownPage: number): boolean {
  return sourcePage === shownPage;
}
