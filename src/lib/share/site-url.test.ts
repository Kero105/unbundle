import { describe, expect, it } from "vitest";
import { parseSiteUrl } from "./site-url";

describe("parseSiteUrl", () => {
  it("returns the origin of a web address", () => {
    expect(parseSiteUrl("https://unbundle.example")).toBe("https://unbundle.example");
    expect(parseSiteUrl("  https://unbundle.example/  ")).toBe("https://unbundle.example");
    expect(parseSiteUrl("http://localhost:3100")).toBe("http://localhost:3100");
  });

  it("drops paths, query strings and fragments, so no tracking parameter survives", () => {
    expect(parseSiteUrl("https://unbundle.example/some/page?utm_source=x&ref=y#top")).toBe(
      "https://unbundle.example",
    );
  });

  it("is null when unset, empty or blank, so the page can say so instead of guessing", () => {
    expect(parseSiteUrl(undefined)).toBeNull();
    expect(parseSiteUrl(null)).toBeNull();
    expect(parseSiteUrl("")).toBeNull();
    expect(parseSiteUrl("   ")).toBeNull();
  });

  it("is null for anything that is not an http(s) address", () => {
    expect(parseSiteUrl("not a url")).toBeNull();
    expect(parseSiteUrl("unbundle.example")).toBeNull();
    expect(parseSiteUrl("javascript:alert(1)")).toBeNull();
    expect(parseSiteUrl("data:text/html,hi")).toBeNull();
    expect(parseSiteUrl("ftp://unbundle.example")).toBeNull();
  });

  it("refuses an address with embedded credentials", () => {
    expect(parseSiteUrl("https://user:pass@unbundle.example")).toBeNull();
    expect(parseSiteUrl("https://user@unbundle.example")).toBeNull();
  });
});
