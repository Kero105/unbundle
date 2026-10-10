import { describe, expect, it } from "vitest";
import { resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("defaults to en with no signals", () => {
    expect(resolveLocale(undefined, undefined)).toBe("en");
    expect(resolveLocale("", "")).toBe("en");
  });

  it("prefers a valid cookie over Accept-Language", () => {
    expect(resolveLocale("es", "en-US,en;q=0.9")).toBe("es");
    expect(resolveLocale("EN", "es")).toBe("en");
  });

  it("ignores an unsupported cookie", () => {
    expect(resolveLocale("fr", "es-MX")).toBe("es");
    expect(resolveLocale("fr", null)).toBe("en");
  });

  it("matches region subtags on the primary language", () => {
    expect(resolveLocale(null, "es-MX,es;q=0.9")).toBe("es");
  });

  it("honors q-values and skips unsupported languages", () => {
    expect(resolveLocale(null, "fr-FR,es;q=0.8,en;q=0.5")).toBe("es");
    expect(resolveLocale(null, "en;q=0.4,es;q=0.9")).toBe("es");
    expect(resolveLocale(null, "es;q=0,en;q=0.1")).toBe("en");
  });

  it("falls back to en when nothing is supported", () => {
    expect(resolveLocale(null, "fr,de;q=0.5")).toBe("en");
    expect(resolveLocale(null, "*")).toBe("en");
  });
});
