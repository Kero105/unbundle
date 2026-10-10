import { describe, expect, it } from "vitest";
import { summarizeConfidence } from "./extraction-confidence";

const rows = (...c: ("high" | "medium" | "low")[]) => c.map((confidence) => ({ confidence }));

describe("summarizeConfidence", () => {
  it("handles an empty bill without calling it low", () => {
    expect(summarizeConfidence([])).toEqual({ rowCount: 0, lowCount: 0, low: false });
  });

  it("is not low when most rows are confident", () => {
    expect(summarizeConfidence(rows("high", "medium", "high", "low"))).toMatchObject({
      rowCount: 4,
      lowCount: 1,
      low: false,
    });
  });

  it("is low at exactly half", () => {
    expect(summarizeConfidence(rows("low", "high")).low).toBe(true);
  });

  it("is low when every row is low", () => {
    expect(summarizeConfidence(rows("low", "low", "low")).low).toBe(true);
  });
});
