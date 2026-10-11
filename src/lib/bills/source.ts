import { getPovertyGuidelines, type PovertyGuidelines } from "@/lib/assistance/poverty-data";
import { getDemoBill, getDemoFindings, getDemoPovertyGuidelines } from "@/lib/demo/data";
import { DEFAULT_DEMO_SCENARIO, type DemoScenario } from "@/lib/demo/scenarios";
import type { ExtractedBill } from "@/lib/types";
import { getBillFindings, type BillFindings } from "./findings";
import { getBillForReview } from "./review-data";

/**
 * Where a page in the bill flow gets its data. One implementation of each page
 * serves both: `demo` reads only bundled synthetic JSON (no database, no
 * Anthropic, no service role), `bill` reads through the user-scoped client.
 */
export type BillSource =
  | { kind: "demo"; scenario?: DemoScenario }
  | { kind: "bill"; id: string };

export type FlowStep = "review" | "report" | "summary" | "letter" | "assistance";

export const DEMO_SOURCE: BillSource = { kind: "demo" };

const STEP_PATH: Record<FlowStep, string> = {
  review: "review",
  report: "report",
  summary: "report/summary",
  letter: "letter",
  assistance: "assistance",
};

export function demoSource(scenario: DemoScenario): BillSource {
  return { kind: "demo", scenario };
}

/**
 * Link to a step of the flow. The standard demo scenario adds no query, so
 * its URLs stay `/demo/review`; other scenarios carry `?scenario=` so every
 * step and link keeps showing the same sample.
 */
export function stepHref(source: BillSource, step: FlowStep, query: Record<string, string> = {}): string {
  const params = new URLSearchParams(query);
  let path: string;
  if (source.kind === "demo") {
    path = `/demo/${STEP_PATH[step]}`;
    if (source.scenario && source.scenario !== DEFAULT_DEMO_SCENARIO) {
      params.set("scenario", source.scenario);
    }
  } else {
    path = `/bills/${encodeURIComponent(source.id)}/${STEP_PATH[step]}`;
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export async function loadBill(source: BillSource): Promise<ExtractedBill | null> {
  return source.kind === "demo" ? getDemoBill(source.scenario) : getBillForReview(source.id);
}

export async function loadFindings(source: BillSource): Promise<BillFindings | null> {
  if (source.kind === "demo") {
    return { bill: getDemoBill(source.scenario), findings: getDemoFindings(source.scenario) };
  }
  return getBillFindings(source.id);
}

export async function loadPovertyGuidelines(source: BillSource): Promise<PovertyGuidelines | null> {
  return source.kind === "demo" ? getDemoPovertyGuidelines(source.scenario) : getPovertyGuidelines();
}
