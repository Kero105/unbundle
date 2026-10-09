import { z } from "zod";
import { ConfidenceSchema } from "./line-item";

export const RuleIdSchema = z.enum([
  "duplicate_charge",
  "math_error",
  "date_mismatch",
  "ncci_unbundling",
  "mue_exceeded",
  "balance_billing",
  "denied_billed_in_full",
  "price_outlier",
  "vague_charge",
]);

export const SeveritySchema = z.enum(["info", "warning", "error"]);

export const FindingSchema = z.object({
  id: z.string(),
  ruleId: RuleIdSchema,
  lineItemIds: z.array(z.string()),
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  amountAtStakeCents: z.number().int().min(0),
  evidence: z.string(),
  citation: z.string(),
});

export type RuleId = z.infer<typeof RuleIdSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type Finding = z.infer<typeof FindingSchema>;
