import { z } from "zod";
import type { PovertyGuidelines } from "@/lib/assistance/poverty-data";
import { ExtractedBillSchema, FindingSchema, type ExtractedBill, type Finding } from "@/lib/types";
import demoBill from "../../../fixtures/review/demo-bill.json";
import demoFindings from "../../../fixtures/review/demo-findings.json";
import demoReference from "../../../fixtures/review/demo-reference.json";
import { DemoReferenceSchema } from "./reference-snapshot";

/**
 * Everything the sample flow shows comes from these three committed JSON files.
 * No database, Anthropic, or service-role access happens here: the findings
 * and reference rows were precomputed once by
 * `scripts/precompute-demo-findings.ts` and are checked against `runRules` by
 * `data.test.ts`. Every file is Zod-validated on load.
 */
export function getDemoBill(): ExtractedBill {
  return ExtractedBillSchema.parse(demoBill);
}

export function getDemoFindings(): Finding[] {
  return z.array(FindingSchema).parse(demoFindings);
}

export function getDemoPovertyGuidelines(): PovertyGuidelines {
  return DemoReferenceSchema.parse(demoReference).poverty;
}
