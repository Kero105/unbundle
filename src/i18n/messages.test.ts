import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("has the same keys in en and es", () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });

  it("has no empty strings", () => {
    for (const messages of [en, es]) {
      for (const key of keys(messages)) {
        const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages);
        expect(value, key).not.toBe("");
      }
    }
  });
});
