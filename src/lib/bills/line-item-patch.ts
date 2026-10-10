import { z } from "zod";
import { ModifierSchema } from "@/lib/types";

const cents = z.number().int().min(-1e12).max(1e12);

/**
 * The fields a user may change on a line item from the review screen. Strict:
 * anything else (bill_id, user_id, confidence, ...) is rejected, not ignored.
 */
export const LineItemPatchSchema = z
  .object({
    dateOfService: z.iso.date().nullable(),
    code: z.string().trim().min(1).max(32).nullable(),
    descriptionRaw: z.string().trim().min(1).max(500),
    modifiers: z.array(ModifierSchema).max(8),
    units: z.number().int().positive().max(100000),
    unitPriceCents: cents.nullable(),
    chargeCents: cents,
    userVerified: z.boolean(),
  })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, { message: "empty" });

export type LineItemPatch = z.infer<typeof LineItemPatchSchema>;

const COLUMNS = {
  dateOfService: "date_of_service",
  code: "code",
  descriptionRaw: "description_raw",
  modifiers: "modifiers",
  units: "units",
  unitPriceCents: "unit_price_cents",
  chargeCents: "charge_cents",
  userVerified: "user_verified",
} as const satisfies Record<keyof z.infer<typeof LineItemPatchSchema>, string>;

export function patchToRow(patch: LineItemPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(COLUMNS)) {
    const value = patch[key as keyof LineItemPatch];
    if (value !== undefined) row[column] = value;
  }
  return row;
}
