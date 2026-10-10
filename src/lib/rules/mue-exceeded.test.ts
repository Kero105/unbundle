import { describe, expect, it } from "vitest";
import { createInMemoryLookups } from "./in-memory-lookups";
import type { Mue } from "./lookups";
import { mueExceeded } from "./mue-exceeded";
import { bill, line } from "./test-helpers";

const mue = (overrides: Partial<Mue> = {}): Mue => ({
  code: "97140",
  mueValue: 6,
  adjudicationIndicator: 3,
  adjudicationText: "Date of Service Edit: Clinical",
  rationale: "synthetic",
  ...overrides,
});

const manual = (units: number, o = {}) =>
  line({
    id: "m1",
    code: "97140",
    units,
    unitPriceCents: 7500,
    chargeCents: units * 7500,
    ...o,
  });
const run = (lines: ReturnType<typeof line>[], mues: Mue[]) =>
  mueExceeded(bill(lines), createInMemoryLookups({ mues }));

describe("mueExceeded", () => {
  it("fires when units exceed the MUE, with excess times unit price", async () => {
    const f = await run([manual(7)], [mue()]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({
      ruleId: "mue_exceeded",
      lineItemIds: ["m1"],
      severity: "warning",
      confidence: "high",
      amountAtStakeCents: 7500,
    });
  });

  it("does not fire exactly at the limit", async () => {
    expect(await run([manual(6)], [mue()])).toEqual([]);
  });

  it("does not fire below the limit", async () => {
    expect(await run([manual(1)], [mue()])).toEqual([]);
  });

  it("does not fire for the same code on two dates when each is under the limit", async () => {
    const lines = [
      manual(4, { id: "a", dateOfService: "2026-10-01" }),
      manual(4, { id: "b", dateOfService: "2026-10-02" }),
    ];
    expect(await run(lines, [mue()])).toEqual([]);
  });

  it("does not fire when the code has no MUE entry", async () => {
    expect(await run([manual(50)], [])).toEqual([]);
    expect(await run([manual(50)], [mue({ code: "97110" })])).toEqual([]);
  });

  it("fires for an MUE of 0 with every unit as excess", async () => {
    const f = await run([manual(2)], [mue({ mueValue: 0 })]);
    expect(f).toHaveLength(1);
    expect(f[0].amountAtStakeCents).toBe(15000);
  });

  it("sums multiple lines of one code on one date", async () => {
    const f = await run(
      [manual(4, { id: "a" }), manual(3, { id: "b" })],
      [mue()],
    );
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ lineItemIds: ["a", "b"], amountAtStakeCents: 7500 });
  });

  it("takes the excess from the last lines first at each line's price", async () => {
    const f = await run(
      [
        manual(4, { id: "a", unitPriceCents: 7000, chargeCents: 28000 }),
        manual(4, { id: "b", unitPriceCents: 8000, chargeCents: 32000 }),
      ],
      [mue()],
    );
    // 8 units, MUE 6: 2 excess units, both from line b.
    expect(f[0].amountAtStakeCents).toBe(16000);
    const g = await run(
      [
        manual(4, { id: "a", unitPriceCents: 7000, chargeCents: 28000 }),
        manual(1, { id: "b", unitPriceCents: 8000, chargeCents: 8000 }),
        manual(3, { id: "c", unitPriceCents: 9000, chargeCents: 27000 }),
      ],
      [mue()],
    );
    // 8 units: 2 excess = 2 from c.
    expect(g[0].amountAtStakeCents).toBe(18000);
    const h = await run(
      [
        manual(6, { id: "a", unitPriceCents: 7000, chargeCents: 42000 }),
        manual(1, { id: "b", unitPriceCents: 8000, chargeCents: 8000 }),
        manual(1, { id: "c", unitPriceCents: 9000, chargeCents: 9000 }),
      ],
      [mue()],
    );
    // 8 units: 2 excess = c then b.
    expect(h[0].amountAtStakeCents).toBe(17000);
  });

  it("fires per code and per date independently", async () => {
    const f = await run(
      [
        manual(7, { id: "a", dateOfService: "2026-10-01" }),
        manual(7, { id: "b", dateOfService: "2026-10-02" }),
      ],
      [mue()],
    );
    expect(f.map((x) => x.lineItemIds)).toEqual([["a"], ["b"]]);
  });

  it("uses medium confidence for indicator 1 and high for 2 and 3", async () => {
    for (const [indicator, confidence] of [
      [1, "medium"],
      [2, "high"],
      [3, "high"],
    ] as const) {
      const f = await run([manual(7)], [mue({ adjudicationIndicator: indicator })]);
      expect(f[0].confidence).toBe(confidence);
      expect(f[0].citation).toBe(`mue_exceeded.adjudication_indicator_${indicator}`);
    }
  });

  it("falls back to charge / units when the unit price is missing", async () => {
    const f = await run([manual(7, { unitPriceCents: null, chargeCents: 52500 })], [mue()]);
    expect(f[0].amountAtStakeCents).toBe(7500);
  });

  it("skips lines without a code or date, and handles an empty bill", async () => {
    expect(await run([], [mue()])).toEqual([]);
    expect(await run([manual(9, { code: null }), manual(9, { dateOfService: null })], [mue()])).toEqual([]);
  });

  it("never reports a negative amount", async () => {
    const f = await run([manual(7, { unitPriceCents: -100, chargeCents: -700 })], [mue()]);
    expect(f[0].amountAtStakeCents).toBe(0);
  });

  it("looks each code up once", async () => {
    let calls = 0;
    const base = createInMemoryLookups({ mues: [mue()] });
    const lookups = { ...base, getMue: async (c: string) => (calls++, base.getMue(c)) };
    await mueExceeded(
      bill([
        manual(7, { id: "a", dateOfService: "2026-10-01" }),
        manual(7, { id: "b", dateOfService: "2026-10-02" }),
      ]),
      lookups,
    );
    expect(calls).toBe(1);
  });
});
