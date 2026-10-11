"use server";

import { z } from "zod";
import { explainForRequest } from "@/lib/explain/server";
import { toExplainErrorCode, type ExplainErrorCode } from "@/lib/explain/types";

export type ExplainActionResult =
  | { ok: true; text: string }
  | { ok: false; error: ExplainErrorCode };

const InputSchema = z
  .object({
    code: z.string().max(12),
    demo: z.boolean().optional(),
  })
  .strict();

/**
 * "What is this?" for one coded line. Only the billing code is used: the
 * line's printed description is deliberately not sent anywhere, so nothing
 * from the bill beyond a public code can reach the model. Failures are opaque
 * codes.
 */
export async function explainCodeAction(input: unknown): Promise<ExplainActionResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_code" };
  try {
    const result = await explainForRequest({
      code: parsed.data.code,
      demo: parsed.data.demo === true,
    });
    return { ok: true, text: result.text };
  } catch (error) {
    return { ok: false, error: toExplainErrorCode(error) };
  }
}
