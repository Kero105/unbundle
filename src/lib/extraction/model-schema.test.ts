import { describe, expect, it } from "vitest";
import good from "../../../fixtures/extraction/model-output-good.json";
import { ExtractionError } from "./errors";
import { MODEL_OUTPUT_JSON_SCHEMA, parseModelOutput } from "./model-schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clone = () => structuredClone(good) as Record<string, any>;

function code(raw: unknown) {
  try {
    parseModelOutput(raw);
  } catch (e) {
    if (e instanceof ExtractionError) return e.code;
    throw e;
  }
  return null;
}

describe("parseModelOutput", () => {
  it("accepts good output and assigns ids, unverified rows, modifiers and a low-confidence row", () => {
    const bill = parseModelOutput(good);
    expect(bill.lineItems.map((i) => i.id)).toEqual(
      bill.lineItems.map((_, i) => `li-${i + 1}`),
    );
    expect(bill.lineItems.every((i) => i.userVerified === false)).toBe(true);
    expect(bill.lineItems.some((i) => i.modifiers.length > 0)).toBe(true);
    expect(bill.lineItems.some((i) => i.confidence === "low")).toBe(true);
    expect(bill.eobLines).toHaveLength(1);
    expect(bill.totalBilledCents).toBe(good.totalBilledCents);
  });

  it("rejects non-object output", () => {
    for (const raw of [null, "text", 42, [], undefined]) expect(code(raw)).toBe("invalid_output");
  });

  it("rejects missing required fields", () => {
    const raw = clone();
    delete raw.lineItems;
    expect(code(raw)).toBe("invalid_output");
  });

  it("rejects a float amount (money must be integer cents)", () => {
    const raw = clone();
    raw.lineItems[0].chargeCents = 155.5;
    expect(code(raw)).toBe("invalid_output");
  });

  it("rejects amounts sent as strings", () => {
    const raw = clone();
    raw.lineItems[0].chargeCents = "$155.00";
    expect(code(raw)).toBe("invalid_output");
  });

  it("rejects an invalid or non-ISO date", () => {
    for (const date of ["09/12/2026", "2026-13-40"]) {
      const raw = clone();
      raw.lineItems[0].dateOfService = date;
      expect(code(raw)).toBe("invalid_output");
    }
  });

  it("rejects malformed modifiers", () => {
    const raw = clone();
    raw.lineItems[0].modifiers = ["abc"];
    expect(code(raw)).toBe("invalid_output");
  });

  it("rejects an unknown confidence value", () => {
    const raw = clone();
    raw.lineItems[0].confidence = "certain";
    expect(code(raw)).toBe("invalid_output");
  });

  it("rejects an out-of-range bounding box", () => {
    const raw = clone();
    raw.lineItems[0].sourceBox = { x: 1.5, y: 0, width: 0.5, height: 0.1 };
    expect(code(raw)).toBe("invalid_output");
  });

  it("rejects zero units", () => {
    const raw = clone();
    raw.lineItems[0].units = 0;
    expect(code(raw)).toBe("invalid_output");
  });

  it("rejects an unreadable (null) bill total rather than guessing", () => {
    const raw = clone();
    raw.totalBilledCents = null;
    expect(code(raw)).toBe("invalid_output");
  });

  it("accepts an empty bill with no line items", () => {
    const raw = clone();
    raw.lineItems = [];
    raw.eobLines = [];
    expect(code(raw)).toBeNull();
  });

  it("errors carry only the opaque code, no values from the output", () => {
    const raw = clone();
    raw.providerName = "SECRET PROVIDER NAME";
    raw.lineItems[0].chargeCents = "SECRET";
    try {
      parseModelOutput(raw);
    } catch (e) {
      expect(String((e as Error).message)).toBe("invalid_output");
      expect(JSON.stringify(e)).not.toContain("SECRET");
    }
  });
});

describe("MODEL_OUTPUT_JSON_SCHEMA", () => {
  it("is a plain object schema without $schema", () => {
    expect(MODEL_OUTPUT_JSON_SCHEMA.type).toBe("object");
    expect(MODEL_OUTPUT_JSON_SCHEMA).not.toHaveProperty("$schema");
    expect(MODEL_OUTPUT_JSON_SCHEMA.additionalProperties).toBe(false);
  });
});
