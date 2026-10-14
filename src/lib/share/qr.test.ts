import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { encode } from "uqr";
import { renderQrSvg } from "./qr";

const root = path.resolve(__dirname, "../../..");

describe("renderQrSvg", () => {
  const url = "https://unbundle.example";
  const svg = renderQrSvg(url);

  it("is a single SVG with a viewBox, drawn in only black on white", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toMatch(/viewBox="0 0 (\d+) \1"/);
    const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(fills)).toEqual(new Set(["#ffffff", "#000000"]));
    expect(svg).not.toMatch(/<script|<image|href=|xlink|style=/i);
  });

  it("has a four-module quiet zone around the code", () => {
    const { size } = encode(url, { ecc: "M", border: 0 });
    const side = Number(/viewBox="0 0 (\d+) /.exec(svg)![1]);
    // Default pixel size is 10 per module; four modules on each side.
    expect(side).toBe((size + 8) * 10);
    const [x, y] = /<path[^>]*d="M(\d+),(\d+)/.exec(svg)!.slice(1).map(Number);
    expect(x).toBeGreaterThanOrEqual(40);
    expect(y).toBeGreaterThanOrEqual(40);
  });

  it("encodes exactly the given text: same input, same code; any change, a different code", () => {
    expect(renderQrSvg(url)).toBe(svg);
    expect(renderQrSvg("https://unbundle.example/")).not.toBe(svg);
    expect(renderQrSvg("https://unbundle.example?utm_source=x")).not.toBe(svg);
  });
});

describe("where the QR code is made", () => {
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

  it("pins the package to an exact version", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies.uqr).toBe("0.1.3");
  });

  it("is imported only from server code, so the encoder never ships to the browser", () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
          const text = read(rel);
          if (/from "uqr"|from "@\/lib\/share\/qr"|from "\.\/qr"/.test(text)) importers.push(rel);
          if (/^"use client"/.test(text)) {
            expect(text, rel).not.toMatch(/from "uqr"|lib\/share\/qr/);
          }
        }
      }
    };
    walk("src");
    expect(importers.sort()).toEqual(["src/app/share/page.tsx", "src/lib/share/qr.ts"]);
  });

  it("feeds one URL variable to the visible link, the QR and the buttons", () => {
    const page = read("src/app/share/page.tsx");
    expect(page).toContain("renderQrSvg(url)");
    expect(page).toContain("getSiteUrl()");
    expect(page).not.toMatch(/utm_|\?ref=|searchParams/);
    expect(page).not.toMatch(/process\.env\.(?!NEXT_PUBLIC_SITE_URL)/);
  });
});
