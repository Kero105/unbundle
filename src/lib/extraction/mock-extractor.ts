import { ExtractedBillSchema, type ExtractedBill } from "@/lib/types";
import demoBill from "../../../fixtures/review/demo-bill.json";
import type { BillExtractor, ExtractionFile } from "./types";

/**
 * Returns the saved synthetic demo bill regardless of input, so the whole
 * upload -> review flow works with no Anthropic credits. The fixture includes
 * a modifier and a low-confidence row. It never reads the uploaded bytes.
 */
export class MockExtractor implements BillExtractor {
  async extractBill(files: ExtractionFile[]): Promise<ExtractedBill> {
    void files;
    return ExtractedBillSchema.parse(structuredClone(demoBill));
  }
}
