import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { describeProviderError, redactKeys } from "./diagnostic";
import { AnthropicExtractor, type MessagesClient } from "./anthropic-extractor";
import { toDiagnostic } from "./errors";

const FAKE_KEY = "sk-ant-api03-FAKEKEY_abc-123";

describe("redactKeys", () => {
  it("replaces key-shaped strings", () => {
    expect(redactKeys(`bad key ${FAKE_KEY} here`)).toBe("bad key [redacted] here");
  });
  it("leaves other text alone", () => {
    expect(redactKeys("model not found")).toBe("model not found");
  });
});

describe("describeProviderError", () => {
  it("reports status, type and message with keys redacted", () => {
    const err = new Anthropic.APIError(
      401,
      { type: "error", error: { type: "authentication_error", message: `invalid x-api-key ${FAKE_KEY}` } },
      undefined,
      new Headers({ "x-secret": "nope" }),
    );
    const out = describeProviderError(err);
    expect(out).toBe("status=401 type=authentication_error message=invalid x-api-key [redacted]");
    expect(out).not.toContain("sk-ant");
    expect(out).not.toContain("nope");
  });

  it("handles non-API errors", () => {
    expect(describeProviderError(new Error(`boom ${FAKE_KEY}`))).toBe(
      "status=n/a type=Error message=boom [redacted]",
    );
  });
});

describe("AnthropicExtractor diagnostics", () => {
  const failing: MessagesClient = {
    messages: {
      create: async () => {
        throw new Anthropic.APIError(
          400,
          { type: "error", error: { type: "invalid_request_error", message: "bad request" } },
          undefined,
          new Headers(),
        );
      },
    },
  };
  const files = [{ kind: "bill" as const, mimeType: "image/jpeg" as const, bytes: new Uint8Array([1, 2, 3]) }];

  it("attaches no detail by default", async () => {
    const error = await new AnthropicExtractor(failing, "m").extractBill(files).catch((e) => e);
    expect(error.code).toBe("provider_error");
    expect(error.message).toBe("provider_error");
    expect(toDiagnostic(error)).toBeUndefined();
  });

  it("attaches detail only when enabled, never in the message", async () => {
    const error = await new AnthropicExtractor(failing, "m", true).extractBill(files).catch((e) => e);
    expect(error.message).toBe("provider_error");
    expect(toDiagnostic(error)).toBe("status=400 type=invalid_request_error message=bad request");
  });
});
