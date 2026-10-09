import type { ExtractedBill, Finding } from "@/lib/types";

/** A rule is a pure, deterministic function: no network, clock, randomness, or LLM. */
export type Rule = (bill: ExtractedBill) => Finding[];
