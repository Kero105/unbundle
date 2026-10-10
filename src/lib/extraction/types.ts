import type { ExtractedBill } from "@/lib/types";
import type { UploadMimeType } from "@/lib/bills/upload-validation";

export type ExtractionFileKind = "bill" | "eob";

export type ExtractionFile = {
  kind: ExtractionFileKind;
  mimeType: UploadMimeType;
  bytes: Uint8Array;
};

/**
 * Reads a bill into structured data. Implementations only read: they never
 * decide findings (CLAUDE.md rule 1). The result is always Zod-validated.
 */
export interface BillExtractor {
  extractBill(files: ExtractionFile[]): Promise<ExtractedBill>;
}
