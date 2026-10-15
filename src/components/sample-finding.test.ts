import { describe, expect, it } from "vitest";
import { buildReport } from "@/app/bills/[id]/report/report-model";
import { getDemoBill, getDemoFindings } from "@/lib/demo/data";

// The home page's sample card is built from the standard demo scenario. If the
// data changes shape the card quietly disappears, so pin what it needs.
describe("home sample finding data", () => {
  it("has a price-outlier finding whose Medicare benchmark is below the billed amount", () => {
    const { findings } = buildReport(getDemoBill(), getDemoFindings());
    const item = findings.find((f) => f.finding.ruleId === "price_outlier");
    const line = item?.lineItems[0];
    expect(item).toBeDefined();
    expect(line).toBeDefined();
    const medicare = line!.chargeCents - item!.finding.amountAtStakeCents;
    expect(medicare).toBeGreaterThan(0);
    expect(medicare).toBeLessThan(line!.chargeCents);
  });
});
