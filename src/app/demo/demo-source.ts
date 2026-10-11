import { demoSource, type BillSource } from "@/lib/bills/source";
import { parseDemoScenario } from "@/lib/demo/scenarios";

/** The demo source for a request: the `?scenario=` sample, or the standard one. */
export async function demoSourceFrom(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<BillSource> {
  const query = await searchParams;
  return demoSource(parseDemoScenario(query.scenario));
}
