import { renderSVG } from "uqr";

/**
 * SVG for a QR code of exactly `url`, made locally by the `uqr` package.
 * Server-only by convention: only server components import this, so the
 * encoder never reaches the browser (a test checks that).
 *
 * Black on white whatever the theme, with the 4-module quiet zone the QR
 * specification asks for. Error correction M suits a short URL.
 */
export function renderQrSvg(url: string): string {
  return renderSVG(url, {
    ecc: "M",
    border: 4,
    whiteColor: "#ffffff",
    blackColor: "#000000",
  });
}
