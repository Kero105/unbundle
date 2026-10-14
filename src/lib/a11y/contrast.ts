/**
 * WCAG 2.x contrast checks for the color tokens in globals.css.
 * Pure: parses CSS text, no file or network access.
 */

export type Theme = "light" | "dark";

export interface Pair {
  fg: string;
  bg: string;
  /** Minimum ratio: 4.5 body text, 3 large text and UI components. */
  min: number;
  note: string;
}

const BODY = 4.5;
const UI = 3;

export const PAIRS: readonly Pair[] = [
  { fg: "foreground", bg: "background", min: BODY, note: "page text" },
  { fg: "card-foreground", bg: "card", min: BODY, note: "card text" },
  { fg: "popover-foreground", bg: "popover", min: BODY, note: "popover text" },
  { fg: "primary-foreground", bg: "primary", min: BODY, note: "primary button" },
  { fg: "secondary-foreground", bg: "secondary", min: BODY, note: "secondary surface" },
  { fg: "accent-foreground", bg: "accent", min: BODY, note: "accent surface" },
  { fg: "muted-foreground", bg: "background", min: BODY, note: "muted text on page" },
  { fg: "muted-foreground", bg: "card", min: BODY, note: "muted text on card" },
  { fg: "muted-foreground", bg: "muted", min: BODY, note: "muted text on muted" },
  { fg: "primary", bg: "background", min: BODY, note: "links and wordmark" },
  { fg: "primary", bg: "card", min: BODY, note: "links on card" },
  { fg: "destructive", bg: "background", min: BODY, note: "error text" },
  { fg: "destructive", bg: "card", min: BODY, note: "error text on card" },
  { fg: "destructive", bg: "destructive-surface", min: BODY, note: "error surface" },
  { fg: "warning-foreground", bg: "warning-surface", min: BODY, note: "warning text" },
  { fg: "warning-foreground", bg: "background", min: BODY, note: "warning text on page" },
  { fg: "success-foreground", bg: "success-surface", min: BODY, note: "success text" },
  { fg: "success-foreground", bg: "background", min: BODY, note: "success text on page" },
  { fg: "foreground", bg: "warning-surface", min: BODY, note: "body on warning surface" },
  { fg: "foreground", bg: "success-surface", min: BODY, note: "body on success surface" },
  { fg: "foreground", bg: "destructive-surface", min: BODY, note: "body on error surface" },
  { fg: "foreground", bg: "muted", min: BODY, note: "text on hover and muted surfaces" },
  { fg: "foreground", bg: "secondary", min: BODY, note: "text on secondary surfaces (demo tips)" },
  { fg: "muted-foreground", bg: "secondary", min: BODY, note: "muted text on secondary (tip step counter)" },
  { fg: "primary", bg: "secondary", min: BODY, note: "links and icons on secondary" },
  { fg: "primary", bg: "muted", min: BODY, note: "links on muted" },
  { fg: "destructive", bg: "muted", min: BODY, note: "error text on muted" },
  { fg: "ring", bg: "background", min: UI, note: "focus ring" },
  { fg: "ring", bg: "secondary", min: UI, note: "focus ring on secondary" },
  { fg: "input", bg: "muted", min: UI, note: "control border on muted" },
  { fg: "input", bg: "secondary", min: UI, note: "control border on secondary" },
  { fg: "ring", bg: "card", min: UI, note: "focus ring on card" },
  { fg: "input", bg: "background", min: UI, note: "input border" },
  { fg: "input", bg: "card", min: UI, note: "input border on card" },
  { fg: "warning-border", bg: "warning-surface", min: UI, note: "warning border" },
  { fg: "success-border", bg: "success-surface", min: UI, note: "success border" },
];

/** The text between the braces of the first block whose selector line starts with `selector`. */
function blockBody(css: string, selector: string, from = 0): string {
  const start = css.indexOf(selector, from);
  if (start === -1) throw new Error(`block not found: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces: ${selector}`);
}

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

/**
 * Token name to hex for one theme, each read from its own block: `:root` for
 * light, and the explicit `:root[data-theme="dark"]` block for dark, layered
 * over light. The system-dark media block repeats the dark one (a test keeps
 * them equal), and the print block is a third palette that is never read here.
 */
export function parseTokens(css: string): Record<Theme, Record<string, string>> {
  const light = declarations(blockBody(css, "\n:root {"));
  const dark = { ...light, ...declarations(blockBody(css, '\n:root[data-theme="dark"] {\n  --')) };
  return { light, dark };
}

/** The dark declarations inside `@media (prefers-color-scheme: dark)`, for the equality check. */
export function systemDarkTokens(css: string): Record<string, string> {
  return declarations(blockBody(css, '\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"])'));
}

/** The palette used when printing, which must stay light. */
export function printTokens(css: string): Record<string, string> {
  const media = blockBody(css, "\n@media print {");
  return declarations(media);
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export interface Result {
  theme: Theme;
  pair: Pair;
  ratio: number;
  ok: boolean;
}

export function checkContrast(css: string): Result[] {
  const tokens = parseTokens(css);
  const results: Result[] = [];
  for (const theme of ["light", "dark"] as const) {
    for (const pair of PAIRS) {
      const fg = tokens[theme][pair.fg];
      const bg = tokens[theme][pair.bg];
      if (!fg || !bg) throw new Error(`missing token for ${pair.fg}/${pair.bg}`);
      const ratio = contrastRatio(fg, bg);
      results.push({ theme, pair, ratio, ok: ratio >= pair.min });
    }
  }
  return results;
}
