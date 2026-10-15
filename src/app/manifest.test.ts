import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const m = manifest();

describe("web app manifest", () => {
  it("serializes to JSON with the required fields", () => {
    const parsed = JSON.parse(JSON.stringify(m));
    expect(parsed).toMatchObject({
      name: "Unbundle",
      short_name: "Unbundle",
      start_url: "/",
      display: "standalone",
    });
    expect(parsed.description).toBeTruthy();
    expect(parsed.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(parsed.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("declares 192, 512 and a maskable 512 icon", () => {
    const icons = m.icons ?? [];
    const has = (sizes: string, purpose: string) =>
      icons.some((i) => i.sizes === sizes && i.purpose === purpose);
    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
  });

  it("points every icon at a real PNG of the declared size", () => {
    for (const icon of m.icons ?? []) {
      const file = path.join(process.cwd(), "public", icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const buf = readFileSync(file);
      expect(buf.subarray(1, 4).toString()).toBe("PNG");
      const [w, h] = (icon.sizes ?? "").split("x").map(Number);
      expect(buf.readUInt32BE(16)).toBe(w);
      expect(buf.readUInt32BE(20)).toBe(h);
    }
  });

  it("has matching en and es install tips", () => {
    expect(Object.keys(es.About.install).sort()).toEqual(Object.keys(en.About.install).sort());
  });
});
