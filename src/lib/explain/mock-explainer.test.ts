import { describe, expect, it } from "vitest";
import { MockExplainer } from "./mock-explainer";

describe("MockExplainer", () => {
  const mock = new MockExplainer((language, kind) => `${language}:${kind}`);

  it("returns a generic template per code type with no network", async () => {
    expect(await mock.explainCode({ code: "99213", language: "en" })).toBe("en:cpt");
    expect(await mock.explainCode({ code: "J1100", language: "es" })).toBe("es:hcpcs");
    expect(await mock.explainCode({ code: "0450", language: "en" })).toBe("en:revenue");
  });

  it("rejects invalid codes", async () => {
    await expect(mock.explainCode({ code: "nope", language: "en" })).rejects.toMatchObject({
      code: "invalid_code",
    });
  });
});
