import { describe, expect, it } from "vitest";
import { localeCookie, localeToSwitchTo, resolveLocale } from "./locale";

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

describe("localeToSwitchTo", () => {
  it("returns the requested locale when it differs", () => {
    expect(localeToSwitchTo("en", "es")).toBe("es");
    expect(localeToSwitchTo("es", "en")).toBe("en");
  });

  it("is a no-op for the active or an unsupported locale", () => {
    expect(localeToSwitchTo("en", "en")).toBeNull();
    expect(localeToSwitchTo("en", "fr")).toBeNull();
    expect(localeToSwitchTo("en", "")).toBeNull();
  });
});

describe("localeCookie", () => {
  it("round-trips through resolveLocale", () => {
    const value = localeCookie("es").split(";")[0].split("=")[1];
    expect(resolveLocale(value, null)).toBe("es");
  });

  it("is site-wide, lax, and long-lived", () => {
    const cookie = localeCookie("en");
    expect(cookie).toContain("NEXT_LOCALE=en");
    expect(cookie).toContain("path=/");
    expect(cookie).toContain("samesite=lax");
    expect(cookie).toContain("max-age=31536000");
  });
});
