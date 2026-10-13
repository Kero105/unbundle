import { describe, expect, it } from "vitest";
import { config } from "@/proxy";
import { isProtectedPath, isPublicDemoPath } from "./routes";

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("route access", () => {
  it.each(["/demo", "/demo/review", "/demo/report", "/demo/letter", "/demo/assistance"])(
    "%s is public and not protected",
    (path) => {
      expect(isPublicDemoPath(path)).toBe(true);
      expect(isProtectedPath(path)).toBe(false);
    },
  );

  it.each([
    "/dashboard",
    "/settings",
    "/bills/abc",
    "/bills/abc/review",
    "/bills/abc/report",
    "/bills/abc/letter",
    "/bills/abc/assistance",
    "/bills/abc/enter",
    "/bills/new/manual",
    "/bills/demo/review",
  ])("%s is protected and not public", (path) => {
    expect(isProtectedPath(path)).toBe(true);
    expect(isPublicDemoPath(path)).toBe(false);
  });

  it("does not treat look-alike prefixes as demo or protected", () => {
    expect(isPublicDemoPath("/demonstration")).toBe(false);
    expect(isPublicDemoPath("/bills/demo")).toBe(false);
    expect(isProtectedPath("/dashboards")).toBe(false);
    expect(isProtectedPath("/billsfoo")).toBe(false);
  });

  it("runs the proxy on every protected path", () => {
    for (const path of ["/dashboard", "/bills/abc/review", "/bills/abc/report"]) {
      expect(matcher.test(path), path).toBe(true);
    }
  });
});
