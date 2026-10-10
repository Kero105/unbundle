import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedBill } from "@/lib/types";
import { ExtractionError } from "./errors";
import { MODEL_OUTPUT_JSON_SCHEMA, parseModelOutput } from "./model-schema";
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from "./prompt";
import type { BillExtractor, ExtractionFile } from "./types";

export const EXTRACTION_MAX_TOKENS = 8000;
export const EXTRACTION_TIMEOUT_MS = 90_000;

/** The one method of the SDK this class uses, so tests can substitute it. */
export type MessagesClient = {
  messages: { create: (body: never, options?: never) => Promise<Anthropic.Message> };
};

function toContentBlock(file: ExtractionFile) {
  const data = Buffer.from(file.bytes).toString("base64");
  if (file.mimeType === "application/pdf") {
    return {
      type: "document" as const,
      source: { type: "base64" as const, media_type: "application/pdf" as const, data },
    };
  }
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: file.mimeType, data },
  };
}

/**
 * Vision extraction through the Anthropic Messages API with a JSON-schema
 * output format. One request, no retries (a timed-out request may still be
 * billed, so retrying could double-bill); the user can retry explicitly and
 * that goes through the per-user rate limit. Nothing about the images or the
 * response is logged, and no error carries the response body.
 */
export class AnthropicExtractor implements BillExtractor {
  constructor(
    private readonly client: MessagesClient,
    private readonly model: string,
  ) {}

  static fromApiKey(apiKey: string, model: string): AnthropicExtractor {
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: EXTRACTION_TIMEOUT_MS });
    return new AnthropicExtractor(client as unknown as MessagesClient, model);
  }

  async extractBill(files: ExtractionFile[]): Promise<ExtractedBill> {
    if (files.length === 0) throw new ExtractionError("no_files");

    // Bill first, then the EOB, each introduced so the model knows which is which.
    const ordered = [...files].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "bill" ? -1 : 1));
    const content = [
      ...ordered.map(toContentBlock),
      { type: "text" as const, text: EXTRACTION_USER_PROMPT },
    ];

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: EXTRACTION_MAX_TOKENS,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
          output_config: {
            effort: "medium",
            format: { type: "json_schema", schema: MODEL_OUTPUT_JSON_SCHEMA },
          },
        } as never,
        { timeout: EXTRACTION_TIMEOUT_MS, maxRetries: 0 } as never,
      );
    } catch (error) {
      throw new ExtractionError(
        error instanceof Anthropic.APIConnectionTimeoutError ? "timeout" : "provider_error",
      );
    }

    if (response.stop_reason === "refusal") throw new ExtractionError("refused");
    if (response.stop_reason === "max_tokens") throw new ExtractionError("truncated");

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new ExtractionError("invalid_output");

    let raw: unknown;
    try {
      raw = JSON.parse(block.text);
    } catch {
      throw new ExtractionError("invalid_output");
    }
    return parseModelOutput(raw);
  }
}
