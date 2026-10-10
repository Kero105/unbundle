import { describe, expect, it } from "vitest";
import { createInMemoryLookups } from "./in-memory-lookups";
import type { PtpEdit } from "./lookups";
import type { Gpci, MpfsRvu } from "./medicare-price";

const edit = (o: Partial<PtpEdit> = {}): PtpEdit => ({
  column1Code: "11111",
  column2Code: "22222",
  effectiveDate: "2020-01-01",
  deletionDate: null,
  modifierIndicator: 1,
  rationale: "Synthetic rationale",
  ...o,
});

const rvu: MpfsRvu = {
  statusCode: "A",
  workRvuX100: 100,
  nonfacilityPeRvuX100: 50,
  facilityPeRvuX100: 25,
  malpracticeRvuX100: 5,
  nonfacilityPeNa: false,
  facilityPeNa: false,
  conversionFactorX10000: 334009,
};
const gpci: Gpci = { workGpciNofloorX1000: 1000, peGpciX1000: 1100, mpGpciX1000: 900 };

describe("in-memory getPtpEdits", () => {
  const lookups = createInMemoryLookups({
    ptpEdits: [
      edit({ effectiveDate: "2020-01-01", deletionDate: "2022-06-30" }),
      edit({ effectiveDate: "2023-01-01" }),
    ],
  });

  it("returns the edit active on the date", async () => {
    expect(await lookups.getPtpEdits("11111", "22222", "2021-03-01")).toHaveLength(1);
  });

  it("treats effective and deletion dates as inclusive", async () => {
    expect(await lookups.getPtpEdits("11111", "22222", "2020-01-01")).toHaveLength(1);
    expect(await lookups.getPtpEdits("11111", "22222", "2022-06-30")).toHaveLength(1);
  });

  it("returns nothing before effective, in a gap, or for the reversed pair", async () => {
    expect(await lookups.getPtpEdits("11111", "22222", "2019-12-31")).toEqual([]);
    expect(await lookups.getPtpEdits("11111", "22222", "2022-07-01")).toEqual([]);
    expect(await lookups.getPtpEdits("22222", "11111", "2021-03-01")).toEqual([]);
  });

  it("returns edits for an empty data set as empty", async () => {
    expect(await createInMemoryLookups().getPtpEdits("11111", "22222", "2021-03-01")).toEqual([]);
  });
});

describe("in-memory getMue / getRate", () => {
  it("looks up MUE by code and returns null when absent", async () => {
    const mue = { code: "93000", mueValue: 1, adjudicationIndicator: 3 as const, adjudicationText: "x", rationale: "y" };
    const lookups = createInMemoryLookups({ mues: [mue] });
    expect(await lookups.getMue("93000")).toEqual(mue);
    expect(await lookups.getMue("99999")).toBeNull();
  });

  it("matches the exact modifier with no fallback to the unmodified row", async () => {
    const lookups = createInMemoryLookups({ rates: [{ code: "93000", rvu }], gpci });
    expect(await lookups.getRate("93000", "")).toEqual({ rvu, gpci });
    expect(await lookups.getRate("93000", "26")).toBeNull();
  });

  it("throws when a rate exists but the GPCI row is missing", async () => {
    const lookups = createInMemoryLookups({ rates: [{ code: "93000", rvu }] });
    await expect(lookups.getRate("93000", "")).rejects.toThrow(/gpci/);
  });
});
