import { z } from "zod";

export const EobLineSchema = z.object({
  id: z.string(),
  dateOfService: z.iso.date().nullable(),
  code: z.string().nullable(),
  billedCents: z.number().int(),
  allowedCents: z.number().int().nullable(),
  planPaidCents: z.number().int().nullable(),
  patientResponsibilityCents: z.number().int().nullable(),
  denialReason: z.string().nullable(),
});

export type EobLine = z.infer<typeof EobLineSchema>;
