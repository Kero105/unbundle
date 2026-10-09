import { z } from "zod";

export const CodeTypeSchema = z.enum(["CPT", "HCPCS", "REVENUE", "DRG", "OTHER"]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

const unit = z.number().min(0).max(1);

export const SourceBoxSchema = z.object({
  x: unit,
  y: unit,
  width: unit,
  height: unit,
});

export const LineItemSchema = z.object({
  id: z.string(),
  dateOfService: z.iso.date().nullable(),
  code: z.string().nullable(),
  codeType: CodeTypeSchema.nullable(),
  descriptionRaw: z.string(),
  units: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().nullable(),
  chargeCents: z.number().int(),
  insurancePaidCents: z.number().int().nullable(),
  patientOwesCents: z.number().int().nullable(),
  sourcePage: z.number().int(),
  sourceBox: SourceBoxSchema.nullable(),
  confidence: ConfidenceSchema,
  userVerified: z.boolean().default(false),
});

export type CodeType = z.infer<typeof CodeTypeSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type SourceBox = z.infer<typeof SourceBoxSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
