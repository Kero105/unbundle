import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSupabaseLookups } from "./supabase-lookups";

type Call = [string, ...unknown[]];

/** Fake PostgREST builder: records the chain, resolves to the queued result. */
function fakeClient(results: { data: unknown; error: { code: string } | null }[]) {
  const queries: { table: string; calls: Call[] }[] = [];
  const client = {
    from(table: string) {
      const q = { table, calls: [] as Call[] };
      queries.push(q);
      const result = results[queries.length - 1];
      const builder: Record<string, unknown> = {
        then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
      };
      for (const m of ["select", "eq", "lte", "or", "order", "limit", "maybeSingle"]) {
        builder[m] = (...args: unknown[]) => {
          q.calls.push([m, ...args]);
          return builder;
        };
      }
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, queries };
}

const ok = (data: unknown) => ({ data, error: null });

describe("supabase getPtpEdits", () => {
  const row = {
    column1_code: "11111",
    column2_code: "22222",
    effective_date: "2020-01-01",
    deletion_date: null,
    modifier_indicator: 1,
    ncci_ptp_rationale: { rationale: "Synthetic" },
  };

  it("queries by edit_set 1, both codes and the date, with an explicit limit", async () => {
    const { client, queries } = fakeClient([ok([row])]);
    const edits = await createSupabaseLookups(client).getPtpEdits("11111", "22222", "2026-03-04");
    expect(edits).toEqual([
      {
        column1Code: "11111",
        column2Code: "22222",
        effectiveDate: "2020-01-01",
        deletionDate: null,
        modifierIndicator: 1,
        rationale: "Synthetic",
      },
    ]);
    const calls = queries[0].calls;
    expect(queries[0].table).toBe("ncci_ptp");
    expect(calls).toContainEqual(["eq", "edit_set", 1]);
    expect(calls).toContainEqual(["eq", "column1_code", "11111"]);
    expect(calls).toContainEqual(["eq", "column2_code", "22222"]);
    expect(calls).toContainEqual(["lte", "effective_date", "2026-03-04"]);
    expect(calls).toContainEqual(["or", "deletion_date.is.null,deletion_date.gte.2026-03-04"]);
    expect(calls.some(([m]) => m === "limit")).toBe(true);
  });

  it("does not query for malformed codes or dates", async () => {
    const { client, queries } = fakeClient([]);
    const l = createSupabaseLookups(client);
    expect(await l.getPtpEdits("123", "22222", "2026-03-04")).toEqual([]);
    expect(await l.getPtpEdits("11111", "22222", "2026-03-04,x.eq.1")).toEqual([]);
    expect(queries).toHaveLength(0);
  });

  it("throws on a DB error without including query values", async () => {
    const { client } = fakeClient([{ data: null, error: { code: "42501" } }]);
    const p = createSupabaseLookups(client).getPtpEdits("11111", "22222", "2026-03-04");
    await expect(p).rejects.toThrow("reference lookup failed: ncci_ptp query (42501)");
  });

  it("throws on rows that fail validation", async () => {
    const { client } = fakeClient([ok([{ ...row, modifier_indicator: 9 }])]);
    await expect(
      createSupabaseLookups(client).getPtpEdits("11111", "22222", "2026-03-04"),
    ).rejects.toThrow(/validation/);
  });
});

describe("supabase getMue", () => {
  it("pins code and practitioner service type", async () => {
    const { client, queries } = fakeClient([
      ok({ code: "93000", mue_value: 1, adjudication_indicator: 3, adjudication_text: "t", rationale: "r" }),
    ]);
    const mue = await createSupabaseLookups(client).getMue("93000");
    expect(mue).toEqual({ code: "93000", mueValue: 1, adjudicationIndicator: 3, adjudicationText: "t", rationale: "r" });
    expect(queries[0].calls).toContainEqual(["eq", "code", "93000"]);
    expect(queries[0].calls).toContainEqual(["eq", "service_type", "practitioner"]);
  });

  it("returns null when there is no row", async () => {
    const { client } = fakeClient([ok(null)]);
    expect(await createSupabaseLookups(client).getMue("93000")).toBeNull();
  });
});

describe("supabase getRate", () => {
  const rate = {
    status_code: "A",
    work_rvu_x100: 100,
    nonfacility_pe_rvu_x100: 50,
    facility_pe_rvu_x100: 25,
    malpractice_rvu_x100: 5,
    nonfacility_pe_na: false,
    facility_pe_na: false,
    conversion_factor_x10000: 334009,
  };
  const gpci = { work_gpci_nofloor_x1000: 1000, pe_gpci_x1000: 1100, mp_gpci_x1000: 900 };

  it("pins code+modifier and MAC 01182 / locality 18, using the standard CF", async () => {
    const { client, queries } = fakeClient([ok(rate), ok(gpci)]);
    const res = await createSupabaseLookups(client).getRate("93000", "26");
    expect(res?.rvu.conversionFactorX10000).toBe(334009);
    expect(res?.gpci).toEqual({ workGpciNofloorX1000: 1000, peGpciX1000: 1100, mpGpciX1000: 900 });
    expect(queries[0].table).toBe("mpfs_rates");
    expect(queries[0].calls).toContainEqual(["eq", "hcpcs_code", "93000"]);
    expect(queries[0].calls).toContainEqual(["eq", "modifier", "26"]);
    const selected = queries[0].calls.find(([m]) => m === "select")?.[1] as string;
    expect(selected).not.toContain("qpp");
    expect(queries[1].table).toBe("gpci");
    expect(queries[1].calls).toContainEqual(["eq", "mac_code", "01182"]);
    expect(queries[1].calls).toContainEqual(["eq", "locality_number", "18"]);
  });

  it("returns null without touching gpci when the rate row is absent", async () => {
    const { client, queries } = fakeClient([ok(null)]);
    expect(await createSupabaseLookups(client).getRate("93000", "")).toBeNull();
    expect(queries).toHaveLength(1);
  });

  it("throws when the LA GPCI row is missing", async () => {
    const { client } = fakeClient([ok(rate), ok(null)]);
    await expect(createSupabaseLookups(client).getRate("93000", "")).rejects.toThrow(/gpci/);
  });
});
