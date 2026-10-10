import { ExtractedBillSchema, type ExtractedBill } from "@/lib/types";
import demoBill from "../../../fixtures/review/demo-bill.json";

/**
 * Data-access boundary for the review screen. Swap the body for a Supabase
 * query (user-scoped client, so RLS applies) and keep the signature: callers
 * only ever see a validated ExtractedBill or null.
 */
const FIXTURES: Record<string, unknown> = {
  demo: demoBill,
};

export async function getBillForReview(id: string): Promise<ExtractedBill | null> {
  if (!Object.hasOwn(FIXTURES, id)) return null;
  return ExtractedBillSchema.parse(FIXTURES[id]);
}
