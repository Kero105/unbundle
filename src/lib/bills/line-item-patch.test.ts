import { describe, expect, it } from "vitest";
import { LineItemPatchSchema, patchToRow } from "./line-item-patch";

describe("LineItemPatchSchema", () => {
  it("accepts a single-field patch", () => {
    expect(LineItemPatchSchema.safeParse({ userVerified: true }).success).toBe(true);
  });

  it("accepts nulls where the column is nullable", () => {
    expect(
      LineItemPatchSchema.safeParse({ dateOfService: null, code: null, unitPriceCents: null }).success,
    ).toBe(true);
  });

  it("rejects an empty patch", () => {
    expect(LineItemPatchSchema.safeParse({}).success).toBe(false);
  });

  it("rejects fields the user may not change", () => {
    for (const patch of [{ user_id: "x" }, { billId: "x" }, { confidence: "high" }, { id: "x" }]) {
      expect(LineItemPatchSchema.safeParse({ userVerified: true, ...patch }).success).toBe(false);
    }
  });

  it("rejects bad values", () => {
    for (const patch of [
      { chargeCents: 1.5 },
      { chargeCents: "10" },
      { units: 0 },
      { units: 2.5 },
      { dateOfService: "2026-02-30" },
      { modifiers: ["abc"] },
      { descriptionRaw: "   " },
      { userVerified: "yes" },
    ]) {
      expect(LineItemPatchSchema.safeParse(patch).success, JSON.stringify(patch)).toBe(false);
    }
  });
});

describe("patchToRow", () => {
  it("maps only the provided fields to columns, keeping explicit nulls", () => {
    expect(patchToRow({ chargeCents: 500, code: null, userVerified: false })).toEqual({
      charge_cents: 500,
      code: null,
      user_verified: false,
    });
  });
});
