import { ExtractedBillSchema, LineItemSchema, type ExtractedBill, type LineItem } from "@/lib/types";

/** Synthetic line item for tests. Defaults are a clean $50.00 single-unit CPT line. */
export function line(overrides: Partial<LineItem> = {}): LineItem {
  return LineItemSchema.parse({
    id: "li-1",
    dateOfService: "2026-10-02",
    code: "93000",
    codeType: "CPT",
    descriptionRaw: "SYNTHETIC LINE",
    units: 1,
    unitPriceCents: 5000,
    chargeCents: 5000,
    insurancePaidCents: null,
    patientOwesCents: null,
    sourcePage: 1,
    sourceBox: null,
    confidence: "high",
    ...overrides,
  });
}

export function bill(lineItems: LineItem[], overrides: Partial<ExtractedBill> = {}): ExtractedBill {
  return ExtractedBillSchema.parse({
    providerName: "Synthetic Clinic",
    serviceStart: "2026-10-02",
    serviceEnd: "2026-10-02",
    totalBilledCents: lineItems.reduce((sum, l) => sum + l.chargeCents, 0),
    insuranceStatus: null,
    lineItems,
    eobLines: [],
    ...overrides,
  });
}
