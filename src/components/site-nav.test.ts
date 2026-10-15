import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("site navigation", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
  const header = read("src/components/site-header.tsx");
  const footer = read("src/components/site-footer.tsx");

  const hrefs = (source: string) =>
    [...source.matchAll(/href[:=]\s*["{]*"(\/[\w/-]*)"/g)].map((m) => m[1]);
  const routeExists = (href: string) =>
    href === "/" ||
    fs.existsSync(path.join(root, "src/app", href, "page.tsx"));

  it("has four header links or fewer, covering the agreed destinations", () => {
    const nav = hrefs(header).filter((h) => h !== "/" && h !== "/settings");
    expect(nav.sort()).toEqual(["/dashboard", "/demo", "/methodology", "/rights"]);
    expect(header).toContain("SignInButton");
  });

  it("only links to routes that exist", () => {
    for (const href of [...hrefs(header), ...hrefs(footer)]) {
      expect(routeExists(href), href).toBe(true);
    }
  });

  it("links the standalone checker and the glossary from the footer", () => {
    expect(hrefs(footer)).toEqual(expect.arrayContaining(["/rights/check", "/glossary"]));
  });

  it("does not repeat the header links in the footer", () => {
    for (const href of ["/methodology", "/rights", "/demo"]) {
      expect(hrefs(footer)).not.toContain(href);
    }
  });
});
