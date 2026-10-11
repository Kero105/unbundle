import Anthropic from "@anthropic-ai/sdk";
import { buildExplainUserPrompt, EXPLAIN_JSON_SCHEMA, EXPLAIN_SYSTEM_PROMPT } from "./prompt";
import { ExplainError, type CodeExplainer, type ExplainRequest } from "./types";
import { parseBillingCode, parseModelExplanation, sanitizeDescription } from "./validate";

export const EXPLAIN_MAX_TOKENS = 400;
export const EXPLAIN_TIMEOUT_MS = 30_000;

/** The one method of the SDK this class uses, so tests can substitute it. */
export type MessagesClient = {
  messages: { create: (body: never, options?: never) => Promise<Anthropic.Message> };
};

/**
 * One bounded, non-retrying request with a JSON-schema output, validated
 * strictly afterwards. Anything unexpected fails closed with an opaque code;
 * the response body is never included in an error or log.
 */
export class AnthropicExplainer implements CodeExplainer {
  constructor(
    private readonly client: MessagesClient,
    private readonly model: string,
  ) {}

  static fromApiKey(apiKey: string, model: string): AnthropicExplainer {
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: EXPLAIN_TIMEOUT_MS });
    return new AnthropicExplainer(client as unknown as MessagesClient, model);
  }

  async explainCode(request: ExplainRequest): Promise<string> {
    // Re-validate here too: this class must be safe even if a caller forgets.
    const code = parseBillingCode(request.code);
    const description = sanitizeDescription(request.description);

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: EXPLAIN_MAX_TOKENS,
          system: EXPLAIN_SYSTEM_PROMPT,
          messages: [
            { role: "user", content: buildExplainUserPrompt(code, request.language, description) },
          ],
          output_config: {
            effort: "low",
            format: { type: "json_schema", schema: EXPLAIN_JSON_SCHEMA },
          },
        } as never,
        { timeout: EXPLAIN_TIMEOUT_MS, maxRetries: 0 } as never,
      );
    } catch (error) {
      throw new ExplainError(
        error instanceof Anthropic.APIConnectionTimeoutError ? "timeout" : "provider_error",
      );
    }

    if (response.stop_reason === "refusal") throw new ExplainError("refused");
    if (response.stop_reason === "max_tokens") throw new ExplainError("truncated");

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new ExplainError("invalid_output");

    let raw: unknown;
    try {
      raw = JSON.parse(block.text);
    } catch {
      throw new ExplainError("invalid_output");
    }
    return parseModelExplanation(raw);
  }
}
