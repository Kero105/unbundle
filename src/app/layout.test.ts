import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("root layout top safe area", () => {
  const source = fs.readFileSync(path.join(__dirname, "layout.tsx"), "utf8");

  it("draws under the status bar only with a page-background strip over the inset", () => {
    expect(source).toContain('viewportFit: "cover"');
    expect(source).toContain("pt-[env(safe-area-inset-top)]");
    expect(source).toMatch(/fixed[^"]*h-\[env\(safe-area-inset-top\)\][^"]*bg-background/);
  });
});
