import { z } from "zod";
import { ModifierSchema } from "@/lib/types";

/**
 * Field schemas and bounds shared by every place a person can set a line item:
 * the review-screen patch and manual entry. One source, so the two cannot
 * drift. Manual entry's SQL function mirrors these numbers (see
 * manual-entry.test.ts).
 */
export const CENTS_LIMIT = 1e12;
export const MAX_CODE_LENGTH = 32;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_MODIFIERS = 8;
export const MAX_UNITS = 100000;

export const centsField = z.number().int().min(-CENTS_LIMIT).max(CENTS_LIMIT);

export const lineItemFields = {
  dateOfService: z.iso.date().nullable(),
  code: z.string().trim().min(1).max(MAX_CODE_LENGTH).nullable(),
  descriptionRaw: z.string().trim().min(1).max(MAX_DESCRIPTION_LENGTH),
  modifiers: z.array(ModifierSchema).max(MAX_MODIFIERS),
  units: z.number().int().positive().max(MAX_UNITS),
  unitPriceCents: centsField.nullable(),
  chargeCents: centsField,
  userVerified: z.boolean(),
} as const;
