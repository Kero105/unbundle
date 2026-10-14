import Anthropic from "@anthropic-ai/sdk";

const MAX_MESSAGE_LENGTH = 300;
const KEY_SHAPED = /sk-ant-[A-Za-z0-9_-]*/g;

/** Replaces anything shaped like an Anthropic API key. */
export function redactKeys(text: string): string {
  return text.replace(KEY_SHAPED, "[redacted]");
}

/**
 * One safe line describing a failed provider call: HTTP status, Anthropic error
 * type and error message only. Built from the parsed error body's type and
 * message, never from the request, headers, or the raw SDK message (which embeds
 * the whole response body). Debug-only: callers must opt in.
 */
export function describeProviderError(error: unknown): string {
  let status = "n/a";
  let type = "unknown";
  let message = "";
  if (error instanceof Anthropic.APIError) {
    if (typeof error.status === "number") status = String(error.status);
    const body: unknown = error.error;
    const inner =
      body && typeof body === "object" && "error" in body ? (body as { error: unknown }).error : body;
    if (inner && typeof inner === "object") {
      const o = inner as { type?: unknown; message?: unknown };
      if (typeof o.type === "string") type = o.type;
      if (typeof o.message === "string") message = o.message;
    }
    if (!message && !(error instanceof Anthropic.APIConnectionError)) message = "(no message)";
    if (error instanceof Anthropic.APIConnectionError) {
      type = error.constructor.name;
      message = error.message;
    }
  } else if (error instanceof Error) {
    type = error.name;
    message = error.message;
  }
  const clipped = redactKeys(message).slice(0, MAX_MESSAGE_LENGTH);
  return `status=${redactKeys(status)} type=${redactKeys(type)} message=${clipped}`;
}
