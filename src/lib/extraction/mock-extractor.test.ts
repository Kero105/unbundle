import { describe, expect, it } from "vitest";
import { ExtractedBillSchema } from "@/lib/types";
import { createExtractor } from "./index";
import { MockExtractor } from "./mock-extractor";

const files = [{ kind: "bill" as const, mimeType: "image/png" as const, bytes: new Uint8Array([1]) }];

describe("MockExtractor", () => {
  it("returns the validated synthetic demo bill with a modifier and a low-confidence row", async () => {
    const bill = await new MockExtractor().extractBill(files);
    expect(ExtractedBillSchema.safeParse(bill).success).toBe(true);
    expect(bill.providerName).toContain("synthetic");
    expect(bill.lineItems.some((i) => i.modifiers.length > 0)).toBe(true);
    expect(bill.lineItems.some((i) => i.confidence === "low")).toBe(true);
    expect(bill.lineItems.every((i) => !i.userVerified)).toBe(true);
  });

  it("returns an independent copy each call", async () => {
    const extractor = new MockExtractor();
    const a = await extractor.extractBill(files);
    a.lineItems[0].chargeCents = 1;
    const b = await extractor.extractBill(files);
    expect(b.lineItems[0].chargeCents).not.toBe(1);
  });
});

describe("createExtractor", () => {
  it("builds the mock extractor for mock mode", () => {
    expect(createExtractor({ mode: "mock" })).toBeInstanceOf(MockExtractor);
  });

  it("builds the Anthropic extractor for anthropic mode without making a request", () => {
    const extractor = createExtractor({ mode: "anthropic", apiKey: "test-key", model: "m" });
    expect(extractor).not.toBeInstanceOf(MockExtractor);
    expect(typeof extractor.extractBill).toBe("function");
  });
});
