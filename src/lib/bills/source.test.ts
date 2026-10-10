import { describe, expect, it } from "vitest";
import { stepHref } from "./source";

describe("stepHref", () => {
  it("routes the demo under /demo", () => {
    expect(stepHref({ kind: "demo" }, "report")).toBe("/demo/report");
  });

  it("routes a bill under /bills/[id] and encodes the id", () => {
    expect(stepHref({ kind: "bill", id: "a b/c" }, "letter")).toBe("/bills/a%20b%2Fc/letter");
  });
});
