export const DEMO_SCENARIOS = ["standard", "er-visit", "clean"] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];
export const DEFAULT_DEMO_SCENARIO: DemoScenario = "standard";

/** Reads a `?scenario=` value; anything unknown means the standard sample. */
export function parseDemoScenario(value: unknown): DemoScenario {
  return typeof value === "string" && (DEMO_SCENARIOS as readonly string[]).includes(value)
    ? (value as DemoScenario)
    : DEFAULT_DEMO_SCENARIO;
}
