import { describe, expect, it } from "vitest";
import type { LetterItem } from "@/app/bills/[id]/letter/letter-model";
import { buildCallScript, type CallScriptText } from "./build-call-script";

const text: CallScriptText = {
  opening: "OPEN",
  closing: "CLOSE",
  generic: "GENERIC",
  line: ({ code, description, date, charge }) => `${code}|${description}|${date}|${charge}`,
  noCode: "NOCODE",
  noDate: "NODATE",
  ask: (reason) => `ask:${reason}`,
  lead: { firm: "FIRM", soft: "SOFT" },
  item: ({ number, amount }) => `#${number} ${amount}`,
};
const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

const item = (over: Partial<LetterItem> = {}): LetterItem => ({
  number: 1,
  findingId: "f1",
  reason: "duplicateCharge",
  tone: "firm",
  lines: [{ code: "80053", description: "Panel", dateOfService: "2026-03-02", chargeCents: 4000 }],
  amountInQuestionCents: 4000,
  ...over,
});

describe("buildCallScript", () => {
  it("falls back to the generic script with no findings", () => {
    expect(buildCallScript([], text, fmt)).toBe("OPEN\n\nGENERIC\nCLOSE");
  });

  it("emits one block per item in the given order, amounts passed through", () => {
    const out = buildCallScript(
      [item({ number: 1, amountInQuestionCents: 9000 }), item({ number: 2, reason: "mathError", tone: "soft" })],
      text,
      fmt,
    );
    expect(out.indexOf("#1 $90.00")).toBeLessThan(out.indexOf("#2 $40.00"));
    expect(out).toContain("  FIRM ask:duplicateCharge");
    expect(out).toContain("  SOFT ask:mathError");
    expect(out).toContain("  80053|Panel|2026-03-02|$40.00");
  });

  it("uses placeholders for a missing code or date", () => {
    const out = buildCallScript(
      [item({ lines: [{ code: null, description: "Misc", dateOfService: null, chargeCents: 100 }] })],
      text,
      fmt,
    );
    expect(out).toContain("NOCODE|Misc|NODATE|$1.00");
  });

  it("handles an item with no resolvable lines and zero amounts", () => {
    const out = buildCallScript([item({ lines: [], amountInQuestionCents: 0 })], text, fmt);
    expect(out).toContain("#1 $0.00");
    expect(out).not.toContain("|");
  });

  it("does not mutate its input and is deterministic", () => {
    const items = [item()];
    const copy = structuredClone(items);
    const a = buildCallScript(items, text, fmt);
    expect(buildCallScript(items, text, fmt)).toBe(a);
    expect(items).toEqual(copy);
  });
});
