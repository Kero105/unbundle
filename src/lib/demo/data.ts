import { z } from "zod";
import type { PovertyGuidelines } from "@/lib/assistance/poverty-data";
import { ExtractedBillSchema, FindingSchema, type ExtractedBill, type Finding } from "@/lib/types";
import demoBill from "../../../fixtures/review/demo-bill.json";
import demoFindings from "../../../fixtures/review/demo-findings.json";
import demoReference from "../../../fixtures/review/demo-reference.json";
import erBill from "../../../fixtures/review/scenarios/er-visit/bill.json";
import erFindings from "../../../fixtures/review/scenarios/er-visit/findings.json";
import erReference from "../../../fixtures/review/scenarios/er-visit/reference.json";
import cleanBill from "../../../fixtures/review/scenarios/clean/bill.json";
import cleanFindings from "../../../fixtures/review/scenarios/clean/findings.json";
import cleanReference from "../../../fixtures/review/scenarios/clean/reference.json";
import { DemoReferenceSchema } from "./reference-snapshot";
import { DEFAULT_DEMO_SCENARIO, type DemoScenario } from "./scenarios";

/**
 * Everything the sample flow shows comes from committed JSON files: three per
 * scenario (bill, findings, reference).
 * No database, Anthropic, or service-role access happens here: the findings
 * and reference rows were precomputed once by
 * `scripts/precompute-demo-findings.ts` and are checked against `runRules` by
 * `data.test.ts`. Every file is Zod-validated on load.
 */
const SNAPSHOTS: Record<DemoScenario, { bill: unknown; findings: unknown; reference: unknown }> = {
  standard: { bill: demoBill, findings: demoFindings, reference: demoReference },
  "er-visit": { bill: erBill, findings: erFindings, reference: erReference },
  clean: { bill: cleanBill, findings: cleanFindings, reference: cleanReference },
};

export function getDemoBill(scenario: DemoScenario = DEFAULT_DEMO_SCENARIO): ExtractedBill {
  return ExtractedBillSchema.parse(SNAPSHOTS[scenario].bill);
}

export function getDemoFindings(scenario: DemoScenario = DEFAULT_DEMO_SCENARIO): Finding[] {
  return z.array(FindingSchema).parse(SNAPSHOTS[scenario].findings);
}

export function getDemoPovertyGuidelines(
  scenario: DemoScenario = DEFAULT_DEMO_SCENARIO,
): PovertyGuidelines {
  return DemoReferenceSchema.parse(SNAPSHOTS[scenario].reference).poverty;
}
