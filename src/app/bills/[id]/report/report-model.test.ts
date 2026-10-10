import { describe, expect, it } from "vitest";
import { FindingSchema, type Finding } from "@/lib/types";
import { bill, line } from "@/lib/rules/test-helpers";
import { buildReport, whyKey } from "./report-model";
import en from "../../../../../messages/en.json";

function finding(id: string, amountAtStakeCents: number, lineItemIds: string[] = ["li-1"]): Finding {
  return FindingSchema.parse({
    id,
    ruleId: "duplicate_charge",
    lineItemIds,
    severity: "warning",
    confidence: "high",
    amountAtStakeCents,
    evidence: "",
    citation: "duplicate_charge.same_code_date_units_price",
  });
}

describe("buildReport", () => {
  const b = bill([line({ id: "li-1" }), line({ id: "li-2", code: "85025" })]);

  it("sorts by amount at stake descending and totals in integer cents", () => {
    const r = buildReport(b, [
      finding("a", 100, ["li-1"]),
      finding("b", 5000, ["li-2"]),
      finding("c", 250, ["li-3"]),
    ]);
    expect(r.findings.map((f) => f.finding.id)).toEqual(["b", "c", "a"]);
    expect(r.totalAtStakeCents).toBe(5350);
  });

  describe("total at stake de-duplication", () => {
    it("counts two findings on the same line once, at the larger amount", () => {
      const r = buildReport(b, [finding("a", 2000, ["li-1"]), finding("b", 7500, ["li-1"])]);
      expect(r.totalAtStakeCents).toBe(7500);
      expect(r.findings.map((f) => f.finding.amountAtStakeCents)).toEqual([7500, 2000]);
    });

    it("adds findings on different lines normally", () => {
      const r = buildReport(b, [finding("a", 2000, ["li-1"]), finding("b", 7500, ["li-2"])]);
      expect(r.totalAtStakeCents).toBe(9500);
    });

    it("counts a finding spanning two lines once, not once per line", () => {
      const r = buildReport(b, [finding("a", 4000, ["li-1", "li-2"])]);
      expect(r.totalAtStakeCents).toBe(4000);
    });

    it("treats a spanning finding and a single-line finding on one of its lines as overlapping", () => {
      const r = buildReport(b, [
        finding("a", 4000, ["li-1", "li-2"]),
        finding("b", 1500, ["li-2"]),
        finding("c", 900, ["li-3"]),
      ]);
      expect(r.totalAtStakeCents).toBe(4900);
    });

    it("is independent of finding order", () => {
      const fs = [
        finding("a", 4000, ["li-1", "li-2"]),
        finding("b", 6000, ["li-2", "li-3"]),
        finding("c", 100, ["li-3"]),
      ];
      expect(buildReport(b, fs).totalAtStakeCents).toBe(6000);
      expect(buildReport(b, [...fs].reverse()).totalAtStakeCents).toBe(6000);
    });

    it("counts findings with no line items in full", () => {
      const r = buildReport(b, [finding("a", 300, []), finding("b", 200, [])]);
      expect(r.totalAtStakeCents).toBe(500);
    });

    it("keeps zero-amount findings harmless", () => {
      const r = buildReport(b, [finding("a", 0, ["li-1"]), finding("b", 800, ["li-1"])]);
      expect(r.totalAtStakeCents).toBe(800);
    });
  });

  it("keeps rule order for ties", () => {
    const r = buildReport(b, [finding("a", 100), finding("b", 100)]);
    expect(r.findings.map((f) => f.finding.id)).toEqual(["a", "b"]);
  });

  it("resolves line items and skips unknown ids", () => {
    const r = buildReport(b, [finding("a", 0, ["li-2", "missing"])]);
    expect(r.findings[0].lineItems.map((l) => l.id)).toEqual(["li-2"]);
  });

  it("handles no findings", () => {
    expect(buildReport(b, [])).toEqual({ findings: [], totalAtStakeCents: 0 });
  });

  it("does not mutate the input", () => {
    const input = [finding("a", 1), finding("b", 2)];
    buildReport(b, input);
    expect(input.map((f) => f.id)).toEqual(["a", "b"]);
  });
});

describe("whyKey", () => {
  it("maps every citation to a message that exists", () => {
    const citations = [
      "duplicate_charge.same_code_date_units_price",
      "math_error.charge_exceeds_units_times_price",
      "date_mismatch.outside_service_range",
      "ncci_unbundling.ptp_indicator_0",
      "ncci_unbundling.ptp_indicator_1",
      "mue_exceeded.adjudication_indicator_1",
      "mue_exceeded.adjudication_indicator_2",
      "mue_exceeded.adjudication_indicator_3",
      "price_outlier.medicare_5x_la_office",
      "vague_charge.uncoded_line",
      "denied_billed_in_full.denied_line_charged_to_patient",
    ];
    for (const c of citations) {
      expect(whyKey(c)).not.toBe("fallback");
      expect(en.Report.why).toHaveProperty(whyKey(c));
    }
  });

  it("falls back for unknown citations", () => {
    expect(whyKey("nope")).toBe("fallback");
    expect(whyKey("constructor")).toBe("fallback");
    expect(en.Report.why).toHaveProperty("fallback");
  });
});
