import type { ExtractionConfig } from "./config";
import { AnthropicExtractor } from "./anthropic-extractor";
import { MockExtractor } from "./mock-extractor";
import type { BillExtractor } from "./types";

export function createExtractor(config: ExtractionConfig, options: { diagnostics?: boolean } = {}): BillExtractor {
  return config.mode === "mock"
    ? new MockExtractor()
    : AnthropicExtractor.fromApiKey(config.apiKey, config.model, options.diagnostics === true);
}

export { readExtractionConfig, type ExtractionConfig } from "./config";
export { ExtractionError, toDiagnostic, toErrorCode, type ExtractionErrorCode } from "./errors";
export type { BillExtractor, ExtractionFile, ExtractionFileKind } from "./types";
