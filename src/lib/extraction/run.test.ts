import { describe, expect, it, vi } from "vitest";
import type { ExtractedBill } from "@/lib/types";
import { ExtractionError, type ExtractionErrorCode } from "./errors";
import { MockExtractor } from "./mock-extractor";
import { runExtraction, type ExtractionStore } from "./run";
import type { BillExtractor, ExtractionFile } from "./types";
import { createSupabaseExtractionStore, interpretClaim, interpretFinish } from "./supabase-store";
import type { SupabaseClient } from "@supabase/supabase-js";

const BILL = "00000000-0000-4000-8000-000000000001";
const bytes = new Uint8Array([1, 2, 3]);
const billFile: ExtractionFile = { kind: "bill", mimeType: "image/png", bytes };
const eobFile: ExtractionFile = { kind: "eob", mimeType: "application/pdf", bytes };

function makeStore(overrides: Partial<ExtractionStore> = {}) {
  const store = {
    claim: vi.fn().mockResolvedValue(undefined),
    loadFiles: vi.fn().mockResolvedValue([billFile]),
    saveResult: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return store satisfies ExtractionStore;
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return (e as ExtractionError).code;
  }
  return null;
}

describe("runExtraction", () => {
  it("claims, extracts, saves and returns needs_review", async () => {
    const store = makeStore();
    const result = await runExtraction({ billId: BILL, store, extractor: new MockExtractor() });
    expect(result).toEqual({ status: "needs_review" });
    expect(store.claim).toHaveBeenCalledWith(BILL);
    expect(store.saveResult).toHaveBeenCalledOnce();
    expect(vi.mocked(store.saveResult).mock.calls[0][2]).toEqual({ includeEob: false });
    expect(store.markFailed).not.toHaveBeenCalled();
  });

  it("includes EOB lines only when an EOB was uploaded", async () => {
    const store = makeStore({ loadFiles: vi.fn().mockResolvedValue([billFile, eobFile]) });
    await runExtraction({ billId: BILL, store, extractor: new MockExtractor() });
    expect(vi.mocked(store.saveResult).mock.calls[0][2]).toEqual({ includeEob: true });
  });

  it.each<ExtractionErrorCode>(["rate_limited", "busy", "not_found", "already_done"])(
    "stops before reading anything when the claim says %s",
    async (code) => {
      const store = makeStore({ claim: vi.fn().mockRejectedValue(new ExtractionError(code)) });
      const extractor: BillExtractor = { extractBill: vi.fn() };
      expect(await codeOf(runExtraction({ billId: BILL, store, extractor }))).toBe(code);
      expect(extractor.extractBill).not.toHaveBeenCalled();
      expect(store.loadFiles).not.toHaveBeenCalled();
      expect(store.markFailed).not.toHaveBeenCalled();
    },
  );

  it("marks the bill failed with the opaque code when extraction fails, and saves nothing", async () => {
    const store = makeStore();
    const extractor: BillExtractor = {
      extractBill: vi.fn().mockRejectedValue(new ExtractionError("invalid_output")),
    };
    expect(await codeOf(runExtraction({ billId: BILL, store, extractor }))).toBe("invalid_output");
    expect(store.markFailed).toHaveBeenCalledWith(BILL, "invalid_output");
    expect(store.saveResult).not.toHaveBeenCalled();
  });

  it("turns unexpected errors into provider_error without leaking their message", async () => {
    const store = makeStore();
    const extractor: BillExtractor = {
      extractBill: vi.fn().mockRejectedValue(new Error("SECRET patient name")),
    };
    const promise = runExtraction({ billId: BILL, store, extractor });
    await expect(promise).rejects.toMatchObject({ message: "provider_error", code: "provider_error" });
    expect(store.markFailed).toHaveBeenCalledWith(BILL, "provider_error");
  });

  it("fails with no_files when nothing was uploaded", async () => {
    const store = makeStore({ loadFiles: vi.fn().mockResolvedValue([]) });
    const extractor: BillExtractor = { extractBill: vi.fn() };
    expect(await codeOf(runExtraction({ billId: BILL, store, extractor }))).toBe("no_files");
    expect(extractor.extractBill).not.toHaveBeenCalled();
    expect(store.markFailed).toHaveBeenCalledWith(BILL, "no_files");
  });

  it("marks failed when saving fails, even if marking itself fails", async () => {
    const store = makeStore({
      saveResult: vi.fn().mockRejectedValue(new ExtractionError("save_failed")),
      markFailed: vi.fn().mockRejectedValue(new Error("db down")),
    });
    expect(
      await codeOf(runExtraction({ billId: BILL, store, extractor: new MockExtractor() })),
    ).toBe("save_failed");
  });

  it("never passes unvalidated data to the store: the saved bill is the extractor's result", async () => {
    const store = makeStore();
    const result = (await new MockExtractor().extractBill([billFile])) as ExtractedBill;
    const extractor: BillExtractor = { extractBill: vi.fn().mockResolvedValue(result) };
    await runExtraction({ billId: BILL, store, extractor });
    expect(vi.mocked(store.saveResult).mock.calls[0][1]).toBe(result);
  });
});

describe("interpretClaim (database rate limit and lock results)", () => {
  it("accepts a claim", () => {
    expect(() => interpretClaim("claimed")).not.toThrow();
  });

  it.each([
    ["rate_limited", "rate_limited"],
    ["busy", "busy"],
    ["not_found", "not_found"],
    ["already_done", "already_done"],
    ["unauthenticated", "unauthenticated"],
    ["something_new", "claim_failed"],
    [null, "claim_failed"],
    [undefined, "claim_failed"],
    [5, "claim_failed"],
  ])("maps %s to %s", (input, code) => {
    try {
      interpretClaim(input);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ExtractionError).code).toBe(code);
    }
  });
});

describe("interpretFinish", () => {
  it("accepts finished", () => {
    expect(() => interpretFinish("finished")).not.toThrow();
  });

  it.each(["not_extracting", "not_found", "invalid_status", "unauthenticated", null, undefined])(
    "rejects %s as save_failed",
    (input) => {
      try {
        interpretFinish(input);
        throw new Error("should have thrown");
      } catch (e) {
        expect((e as ExtractionError).code).toBe("save_failed");
      }
    },
  );
});

describe("supabase store status changes", () => {
  function fakeClient(rpcResult: { data: unknown; error: unknown } = { data: "finished", error: null }) {
    const updates: Record<string, unknown>[] = [];
    const rpc = vi.fn().mockResolvedValue(rpcResult);
    const builder = {
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return { eq: async () => ({ error: null }) };
      },
    };
    const client = { rpc, from: () => builder } as unknown as SupabaseClient;
    return { client, rpc, updates };
  }

  const USER = "00000000-0000-4000-8000-0000000000aa";

  it("saveResult finishes through finish_extraction and never writes status columns", async () => {
    const { client, rpc, updates } = fakeClient();
    const bill = await new MockExtractor().extractBill([billFile]);
    await createSupabaseExtractionStore(client, USER).saveResult(BILL, bill, { includeEob: false });
    expect(rpc).toHaveBeenCalledWith("finish_extraction", {
      p_bill_id: BILL,
      p_status: "needs_review",
      p_error_code: null,
    });
    for (const values of updates) {
      expect(values).not.toHaveProperty("extraction_status");
      expect(values).not.toHaveProperty("extraction_error_code");
      expect(values).not.toHaveProperty("extraction_started_at");
    }
  });

  it("saveResult fails when finish_extraction rejects", async () => {
    const { client } = fakeClient({ data: "not_extracting", error: null });
    const bill = await new MockExtractor().extractBill([billFile]);
    const store = createSupabaseExtractionStore(client, USER);
    expect(await codeOf(store.saveResult(BILL, bill, { includeEob: false }))).toBe("save_failed");
  });

  it("markFailed calls finish_extraction with the opaque code and writes no columns", async () => {
    const { client, rpc, updates } = fakeClient();
    await createSupabaseExtractionStore(client, USER).markFailed(BILL, "timeout");
    expect(rpc).toHaveBeenCalledWith("finish_extraction", {
      p_bill_id: BILL,
      p_status: "failed",
      p_error_code: "timeout",
    });
    expect(updates).toHaveLength(0);
  });

  it("markFailed surfaces an rpc error", async () => {
    const { client } = fakeClient({ data: null, error: { message: "x" } });
    const store = createSupabaseExtractionStore(client, USER);
    expect(await codeOf(store.markFailed(BILL, "timeout"))).toBe("save_failed");
  });
});
