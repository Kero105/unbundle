import type { ExtractedBill } from "@/lib/types";
import { ExtractionError, toErrorCode, type ExtractionErrorCode } from "./errors";
import type { BillExtractor, ExtractionFile } from "./types";

/** Persistence and locking, injected so the flow is testable without a database. */
export interface ExtractionStore {
  /** Atomically checks ownership, the rate limit and "already running". Throws ExtractionError. */
  claim(billId: string): Promise<void>;
  loadFiles(billId: string): Promise<ExtractionFile[]>;
  saveResult(billId: string, bill: ExtractedBill, opts: { includeEob: boolean }): Promise<void>;
  markFailed(billId: string, code: ExtractionErrorCode): Promise<void>;
}

/**
 * Claims the bill, reads it with the extractor, and stores the validated
 * result as "needs_review". On any failure after the claim the bill is marked
 * "failed" with an opaque code; nothing from the model is kept.
 *
 * The caller reads the config (kill switch, mode, key) before this, so a
 * disabled or misconfigured server never consumes a user's rate-limit slot.
 */
export async function runExtraction(args: {
  billId: string;
  store: ExtractionStore;
  extractor: BillExtractor;
}): Promise<{ status: "needs_review" }> {
  const { billId, store, extractor } = args;

  await store.claim(billId);

  try {
    const files = await store.loadFiles(billId);
    if (files.length === 0) throw new ExtractionError("no_files");

    const bill = await extractor.extractBill(files);
    await store.saveResult(billId, bill, { includeEob: files.some((f) => f.kind === "eob") });
    return { status: "needs_review" };
  } catch (error) {
    const code = toErrorCode(error);
    try {
      await store.markFailed(billId, code);
    } catch {
      // Best effort: a stale "extracting" is reclaimed after 5 minutes.
    }
    throw new ExtractionError(code);
  }
}
