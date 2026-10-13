import { describe, expect, it } from "vitest";
import { MAX_BILLS_PER_USER } from "./limits";
import { submitManualBill, type ManualSubmitStore } from "./submit-manual";

const TODAY = "2026-10-12";
const BILL_ID = "8f3c2c0e-5b6c-4f67-9a43-6f2f5d3a1b11";

const valid = {
  header: { providerName: "Synthetic Clinic", serviceStart: null, serviceEnd: null },
  lines: [
    {
      dateOfService: null,
      code: "99214",
      descriptionRaw: "SYNTHETIC VISIT",
      modifiers: [],
      units: 1,
      unitPriceCents: null,
      chargeCents: 100,
    },
  ],
};

function fakeStore(overrides: Partial<ManualSubmitStore> = {}) {
  const calls: string[] = [];
  const store: ManualSubmitStore = {
    async countBills() {
      calls.push("count");
      return 0;
    },
    async createBill() {
      calls.push("create");
      return "11111111-1111-4111-8111-111111111111";
    },
    async deleteBill(id) {
      calls.push(`delete:${id}`);
    },
    async submit({ billId }) {
      calls.push(`submit:${billId}`);
      return "submitted";
    },
    ...overrides,
  };
  return { store, calls };
}

describe("submitManualBill", () => {
  it("rejects an invalid payload before touching the store", async () => {
    const { store, calls } = fakeStore();
    const r = await submitManualBill({ store, input: { header: {}, lines: [] }, today: TODAY });
    expect(r).toEqual({ ok: false, error: "invalid" });
    expect(calls).toEqual([]);
  });

  it("creates the bill lazily and submits it", async () => {
    const { store, calls } = fakeStore();
    const r = await submitManualBill({ store, input: valid, today: TODAY });
    expect(r).toEqual({ ok: true, billId: "11111111-1111-4111-8111-111111111111" });
    expect(calls).toEqual(["count", "create", "submit:11111111-1111-4111-8111-111111111111"]);
  });

  it("uses an existing bill without creating or deleting one", async () => {
    const { store, calls } = fakeStore({ async submit() { return "not_found"; } });
    const r = await submitManualBill({ store, input: { ...valid, billId: BILL_ID }, today: TODAY });
    expect(r).toEqual({ ok: false, error: "not_found" });
    expect(calls).toEqual([]);
  });

  it("deletes the bill it created when the function rejects", async () => {
    const { store, calls } = fakeStore({ async submit() { return "bad_cents"; } });
    const r = await submitManualBill({ store, input: valid, today: TODAY });
    expect(r).toEqual({ ok: false, error: "bad_cents" });
    expect(calls).toContain("delete:11111111-1111-4111-8111-111111111111");
  });

  it("deletes the bill it created when the call throws", async () => {
    const { store, calls } = fakeStore({
      async submit() {
        throw new Error("rpc_failed");
      },
    });
    const r = await submitManualBill({ store, input: valid, today: TODAY });
    expect(r).toEqual({ ok: false, error: "save_failed" });
    expect(calls).toContain("delete:11111111-1111-4111-8111-111111111111");
  });

  it("still reports the rejection if the cleanup delete fails", async () => {
    const { store } = fakeStore({
      async submit() {
        return "busy";
      },
      async deleteBill() {
        throw new Error("delete_failed");
      },
    });
    expect(await submitManualBill({ store, input: valid, today: TODAY })).toEqual({ ok: false, error: "busy" });
  });

  it("stops at the bill limit without creating anything", async () => {
    const { store, calls } = fakeStore({ async countBills() { return MAX_BILLS_PER_USER; } });
    const r = await submitManualBill({ store, input: valid, today: TODAY });
    expect(r).toEqual({ ok: false, error: "too_many_bills" });
    expect(calls).toEqual([]);
  });

  it("maps a creation failure to save_failed", async () => {
    const { store } = fakeStore({
      async createBill() {
        throw new Error("create_failed");
      },
    });
    expect(await submitManualBill({ store, input: valid, today: TODAY })).toEqual({ ok: false, error: "save_failed" });
  });

  it("never returns typed content in an error", async () => {
    const { store } = fakeStore({ async submit() { return "bad_description"; } });
    const r = await submitManualBill({ store, input: valid, today: TODAY });
    expect(JSON.stringify(r)).not.toMatch(/Synthetic|SYNTHETIC|99214/);
  });
});

describe("hostile input never reaches the store", () => {
  const withLine = (patch: Record<string, unknown>) => ({
    ...valid,
    lines: [{ ...valid.lines[0], ...patch }],
  });
  const withHeader = (patch: Record<string, unknown>) => ({
    ...valid,
    header: { ...valid.header, ...patch },
  });

  const cases: [string, unknown][] = [
    ["null", null],
    ["a string", "lines"],
    ["an array", []],
    ["lines is null", { ...valid, lines: null }],
    ["lines is a string", { ...valid, lines: "x" }],
    ["lines is an object", { ...valid, lines: { 0: valid.lines[0] } }],
    ["101 lines", { ...valid, lines: Array(101).fill(valid.lines[0]) }],
    ["header is null", { ...valid, header: null }],
    ["header is an array", { ...valid, header: [] }],
    ["header has an unknown key", withHeader({ totalBilledCents: 1 })],
    ["a line that is not an object", { ...valid, lines: ["x"] }],
    ["a nested object in a field", withLine({ descriptionRaw: { a: 1 } })],
    ["a nested array in a field", withLine({ code: ["99214"] })],
    ["charge as a string", withLine({ chargeCents: "100" })],
    ["charge as a float", withLine({ chargeCents: 10.5 })],
    ["charge of 1e13", withLine({ chargeCents: 1e13 })],
    ["units as a string", withLine({ units: "1" })],
    ["units as a float", withLine({ units: 1.5 })],
    ["negative units", withLine({ units: -1 })],
    ["an impossible date", withLine({ dateOfService: "2026-02-30" })],
    ["a non-date", withLine({ dateOfService: "yesterday" })],
    ["end before start", withHeader({ serviceStart: "2026-10-05", serviceEnd: "2026-10-01" })],
    ["a non-uuid bill id", { ...valid, billId: "1 or 1=1" }],
    ["a null bill id", { ...valid, billId: null }],
  ];

  it.each(cases)("rejects %s", async (_name, hostile) => {
    const { store, calls } = fakeStore();
    const r = await submitManualBill({ store, input: hostile, today: TODAY });
    expect(r).toEqual({ ok: false, error: "invalid" });
    expect(calls).toEqual([]);
  });
});

