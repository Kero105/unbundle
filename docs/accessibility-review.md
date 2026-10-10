# Accessibility and responsive review

Reviewed 2026-10-10 from source only. No browser, screen reader or device testing was done.

## Checked and already in good shape

- **Headings:** every page has exactly one `h1` (landing, demo, review, report, letter, assistance, upload, dashboard, about, privacy, terms; 404 and error through `ErrorState`). Sections use `h2`/`h3` beneath it.
- **Landmarks:** each page renders one `main`; header, footer and footer `nav` have labels.
- **Skip link:** present in the header, targets `#content` (focusable container).
- **Language:** `<html lang="en">` is static; regions (header, `main`, footer, letter preview) carry `lang={locale}` and the language toggle updates `documentElement.lang`. See "could not verify" below.
- **Forms:** inputs use labels, hints and errors wired with `aria-describedby`/`aria-invalid`; the review table's cell inputs use `aria-label`.
- **Async status:** `role="status"`/`aria-live="polite"` on upload, review save state and assistance results; `role="alert"` on errors.
- **Focus:** global `:focus-visible` outline (3px, `--ring`, 2px offset).
- **Reduced motion:** global `prefers-reduced-motion` rule shortens animations and transitions.

## Fixed in this pass

1. **Contrast:** added `src/lib/a11y/contrast.ts`, a vitest guard (`contrast.test.ts`) and `scripts/check-contrast.ts`, covering 27 text/surface and border/ring pairs in light and dark. One failure: light `--input` border (#a99f8d, 2.45:1 on the page). Changed to #857b69 (3.90:1). All pairs now pass AA (4.5 text, 3 for borders and focus rings). Run: `JITI_ALIAS='{"@":"./src"}' npx jiti scripts/check-contrast.ts`.
2. **Tap targets:** `Button` size `sm` and `icon-sm` were 36px; now 44px, like the default. Checkbox hit area extended to 44px with the existing `after:` overlay.
3. **360px overflow safeguards:** `overflow-wrap: break-word` on `body`; `img`, `svg`, `video`, `canvas` capped at 100% width. The about table already scrolls inside its own `overflow-x-auto` wrapper, and the long-text containers on dashboard, review and letter use `min-w-0`/`break-words`.

## Could not verify without a browser

- Actual rendering at 360px, 200% zoom and 400% reflow (the CSS reads correctly, but wide shadcn components such as the review table were not seen).
- `<html lang>` on a first Spanish load: the root layout is static (needed for Partial Prerendering), so assistive tech may announce the document as English until a region's `lang` applies. A route-level fix would need the locale at the root layout, which makes it dynamic. Decide whether that trade-off is worth it.
- Screen reader behavior of live regions and the language toggle.
- Hover/focus states of the shadcn `Checkbox` with the larger hit area, and sticky card (`review-table`) overlapping content at small heights.
- Contrast of text over translucent overlays and `/30`-style opacity utilities (the script checks tokens, not composited colors).
