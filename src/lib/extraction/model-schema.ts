import { z } from "zod";
import { ExtractedBillSchema, type ExtractedBill } from "@/lib/types";
import { ExtractionError } from "./errors";

/**
 * What the model is asked to return. It mirrors ExtractedBill minus the ids we
 * assign ourselves, using only plain JSON-schema types so it can be passed as
 * the structured-output schema. Strict validation happens afterwards, against
 * ExtractedBillSchema, so this schema is deliberately permissive in shape.
 */
const ModelLineItemSchema = z.object({
  dateOfService: z.string().nullable(),
  code: z.string().nullable(),
  codeType: z.enum(["CPT", "HCPCS", "REVENUE", "DRG", "OTHER"]).nullable(),
  descriptionRaw: z.string(),
  modifiers: z.array(z.string()),
  units: z.number(),
  unitPriceCents: z.number().nullable(),
  chargeCents: z.number(),
  insurancePaidCents: z.number().nullable(),
  patientOwesCents: z.number().nullable(),
  sourcePage: z.number(),
  sourceBox: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

const ModelEobLineSchema = z.object({
  dateOfService: z.string().nullable(),
  code: z.string().nullable(),
  billedCents: z.number(),
  allowedCents: z.number().nullable(),
  planPaidCents: z.number().nullable(),
  patientResponsibilityCents: z.number().nullable(),
  denialReason: z.string().nullable(),
});

export const ModelOutputSchema = z.object({
  providerName: z.string(),
  serviceStart: z.string().nullable(),
  serviceEnd: z.string().nullable(),
  totalBilledCents: z.number().nullable(),
  insuranceStatus: z.string().nullable(),
  lineItems: z.array(ModelLineItemSchema),
  eobLines: z.array(ModelEobLineSchema),
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;

/**
 * Rewrites `type: ["string", "null"]` as `anyOf: [{type: "string"}, {type: "null"}]`,
 * the nullable form structured outputs documents. Zod emits the array form.
 */
export function nullableToAnyOf(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(nullableToAnyOf);
  if (node === null || typeof node !== "object") return node;
  const { type, ...rest } = node as Record<string, unknown>;
  const converted = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, nullableToAnyOf(v)]));
  if (Array.isArray(type)) return { ...converted, anyOf: type.map((t) => ({ type: t })) };
  return type === undefined ? converted : { type, ...converted };
}

/** JSON Schema handed to the API as the output format. */
export const MODEL_OUTPUT_JSON_SCHEMA: Record<string, unknown> = (() => {
  const { $schema, ...schema } = z.toJSONSchema(ModelOutputSchema) as Record<string, unknown>;
  void $schema;
  return nullableToAnyOf(schema) as Record<string, unknown>;
})();

/**
 * Validates raw model JSON and turns it into an ExtractedBill. Any failure is
 * the opaque "invalid_output" code: issues are dropped because they can echo
 * values from the bill, and the raw output is never kept.
 */
export function parseModelOutput(raw: unknown): ExtractedBill {
  const lax = ModelOutputSchema.safeParse(raw);
  if (!lax.success) throw new ExtractionError("invalid_output");
  const out = lax.data;

  // A bill whose total can't be read can't be checked; fail rather than guess.
  if (out.totalBilledCents === null) throw new ExtractionError("invalid_output");

  const strict = ExtractedBillSchema.safeParse({
    ...out,
    lineItems: out.lineItems.map((item, i) => ({ ...item, id: `li-${i + 1}`, userVerified: false })),
    eobLines: out.eobLines.map((line, i) => ({ ...line, id: `eob-${i + 1}` })),
  });
  if (!strict.success) throw new ExtractionError("invalid_output");
  return strict.data;
}
