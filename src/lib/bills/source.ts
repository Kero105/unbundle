import { getPovertyGuidelines, type PovertyGuidelines } from "@/lib/assistance/poverty-data";
import { getDemoBill, getDemoFindings, getDemoPovertyGuidelines } from "@/lib/demo/data";
import type { ExtractedBill } from "@/lib/types";
import { getBillFindings, type BillFindings } from "./findings";
import { getBillForReview } from "./review-data";

/**
 * Where a page in the bill flow gets its data. One implementation of each page
 * serves both: `demo` reads only bundled synthetic JSON (no database, no
 * Anthropic, no service role), `bill` reads through the user-scoped client.
 */
export type BillSource = { kind: "demo" } | { kind: "bill"; id: string };

export type FlowStep = "review" | "report" | "letter" | "assistance";

export const DEMO_SOURCE: BillSource = { kind: "demo" };

export function stepHref(source: BillSource, step: FlowStep): string {
  return source.kind === "demo"
    ? `/demo/${step}`
    : `/bills/${encodeURIComponent(source.id)}/${step}`;
}

export async function loadBill(source: BillSource): Promise<ExtractedBill | null> {
  return source.kind === "demo" ? getDemoBill() : getBillForReview(source.id);
}

export async function loadFindings(source: BillSource): Promise<BillFindings | null> {
  if (source.kind === "demo") return { bill: getDemoBill(), findings: getDemoFindings() };
  return getBillFindings(source.id);
}

export async function loadPovertyGuidelines(source: BillSource): Promise<PovertyGuidelines | null> {
  return source.kind === "demo" ? getDemoPovertyGuidelines() : getPovertyGuidelines();
}
