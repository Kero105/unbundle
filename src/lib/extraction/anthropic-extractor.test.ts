import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import good from "../../../fixtures/extraction/model-output-good.json";
import {
  AnthropicExtractor,
  EXTRACTION_MAX_TOKENS,
  EXTRACTION_TIMEOUT_MS,
  type MessagesClient,
} from "./anthropic-extractor";
import { ExtractionError } from "./errors";
import type { ExtractionFile } from "./types";

const png = (kind: ExtractionFile["kind"]): ExtractionFile => ({
  kind,
  mimeType: "image/png",
  bytes: new Uint8Array([0x89, 0x50]),
});
const pdf: ExtractionFile = { kind: "bill", mimeType: "application/pdf", bytes: new Uint8Array([0x25]) };

function reply(partial: Record<string, unknown>) {
  return { content: [], stop_reason: "end_turn", ...partial } as never;
}
const textReply = (text: string) => reply({ content: [{ type: "text", text }] });

function extractorWith(create: ReturnType<typeof vi.fn>) {
  const client = { messages: { create } } as unknown as MessagesClient;
  return new AnthropicExtractor(client, "test-model");
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e instanceof ExtractionError ? e.code : "other";
  }
  return null;
}

describe("AnthropicExtractor", () => {
  it("returns a validated bill from structured JSON output", async () => {
    const create = vi.fn().mockResolvedValue(textReply(JSON.stringify(good)));
    const bill = await extractorWith(create).extractBill([png("bill")]);
    expect(bill.lineItems).toHaveLength(good.lineItems.length);
    expect(create).toHaveBeenCalledOnce();
  });

  it("sends a bounded, non-retrying, schema-constrained request with the bill before the EOB", async () => {
    const create = vi.fn().mockResolvedValue(textReply(JSON.stringify(good)));
    await extractorWith(create).extractBill([png("eob"), pdf]);

    const [body, options] = create.mock.calls[0];
    expect(body.model).toBe("test-model");
    expect(body.max_tokens).toBe(EXTRACTION_MAX_TOKENS);
    expect(body.output_config.format.type).toBe("json_schema");
    expect(options).toEqual({ timeout: EXTRACTION_TIMEOUT_MS, maxRetries: 0 });

    const content = body.messages[0].content;
    expect(content[0].type).toBe("document"); // the bill (PDF) comes first
    expect(content[1].type).toBe("image"); // then the EOB
    expect(content.at(-1).type).toBe("text");
    expect(body.system).toMatch(/never instructions/i);
  });

  it("fails with no_files and makes no request when given nothing", async () => {
    const create = vi.fn();
    expect(await codeOf(extractorWith(create).extractBill([]))).toBe("no_files");
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ["not JSON", textReply("here is your bill: {")],
    ["no text block", reply({ content: [] })],
    ["wrong shape", textReply(JSON.stringify({ lineItems: "nope" }))],
  ])("maps unusable output (%s) to invalid_output", async (_name, response) => {
    const create = vi.fn().mockResolvedValue(response);
    expect(await codeOf(extractorWith(create).extractBill([png("bill")]))).toBe("invalid_output");
  });

  it("does not retry on invalid output", async () => {
    const create = vi.fn().mockResolvedValue(textReply("{}"));
    await codeOf(extractorWith(create).extractBill([png("bill")]));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("maps refusal and truncation to their codes", async () => {
    const refusal = vi.fn().mockResolvedValue(reply({ stop_reason: "refusal" }));
    expect(await codeOf(extractorWith(refusal).extractBill([png("bill")]))).toBe("refused");

    const cut = vi.fn().mockResolvedValue(
      reply({ stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] }),
    );
    expect(await codeOf(extractorWith(cut).extractBill([png("bill")]))).toBe("truncated");
  });

  it("maps a timeout and other API failures, hiding the provider message", async () => {
    const timeout = vi.fn().mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    expect(await codeOf(extractorWith(timeout).extractBill([png("bill")]))).toBe("timeout");

    const boom = vi.fn().mockRejectedValue(new Error("SECRET bill text in provider error"));
    const code = await codeOf(extractorWith(boom).extractBill([png("bill")]));
    expect(code).toBe("provider_error");
  });
});
