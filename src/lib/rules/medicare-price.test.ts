import { describe, expect, it } from "vitest";
import { medicarePriceCents, type Gpci, type MpfsRvu } from "./medicare-price";

// 99213 with 2026 RVUs and Los Angeles GPCI (facility PE RVU is an arbitrary test value).
const rvu99213: MpfsRvu = {
  statusCode: "A",
  workRvuX100: 130,
  nonfacilityPeRvuX100: 146,
  facilityPeRvuX100: 90,
  malpracticeRvuX100: 9,
  nonfacilityPeNa: false,
  facilityPeNa: false,
  conversionFactorX10000: 334009,
};
const gpciLA: Gpci = { workGpciNofloorX1000: 1041, peGpciX1000: 1183, mpGpciX1000: 664 };

describe("medicarePriceCents", () => {
  it("prices 99213 in an office in Los Angeles", () => {
    expect(medicarePriceCents({ rvu: rvu99213, gpci: gpciLA, placeOfService: "office" })).toBe(10489);
  });

  it("uses the facility PE RVU for facility place of service", () => {
    // s = 130*1041 + 90*1183 + 9*664 = 135330 + 106470 + 5976 = 247776
    // 247776 * 334009 / 1e7 = 8276.0... -> 8276
    expect(medicarePriceCents({ rvu: rvu99213, gpci: gpciLA, placeOfService: "facility" })).toBe(8276);
  });

  it("returns null when the PE RVU for the place of service is NA", () => {
    const rvu = { ...rvu99213, facilityPeNa: true };
    expect(medicarePriceCents({ rvu, gpci: gpciLA, placeOfService: "facility" })).toBeNull();
    // The other setting is unaffected.
    expect(medicarePriceCents({ rvu, gpci: gpciLA, placeOfService: "office" })).toBe(10489);
    const rvuOffNa = { ...rvu99213, nonfacilityPeNa: true };
    expect(medicarePriceCents({ rvu: rvuOffNa, gpci: gpciLA, placeOfService: "office" })).toBeNull();
  });

  it("returns null when the status code is not A", () => {
    for (const statusCode of ["I", "B", "N", ""]) {
      const rvu = { ...rvu99213, statusCode };
      expect(medicarePriceCents({ rvu, gpci: gpciLA, placeOfService: "office" })).toBeNull();
    }
  });

  describe("rounding", () => {
    // CF 1.0000 (10000) makes cents = s / 1000, so s = 500 is exactly 0.5 cents.
    const base: MpfsRvu = {
      statusCode: "A",
      workRvuX100: 1,
      nonfacilityPeRvuX100: 0,
      facilityPeRvuX100: 0,
      malpracticeRvuX100: 0,
      nonfacilityPeNa: false,
      facilityPeNa: false,
      conversionFactorX10000: 10000,
    };
    const price = (workGpci: number) =>
      medicarePriceCents({
        rvu: base,
        gpci: { workGpciNofloorX1000: workGpci, peGpciX1000: 1000, mpGpciX1000: 1000 },
        placeOfService: "office",
      });

    it("rounds exactly .5 up", () => {
      expect(price(500)).toBe(1);
      expect(price(1500)).toBe(2);
    });

    it("rounds just below .5 down", () => {
      expect(price(499)).toBe(0);
      expect(price(1499)).toBe(1);
    });

    it("rounds just above .5 up", () => {
      expect(price(501)).toBe(1);
    });
  });

  it("returns 0 for all-zero RVUs", () => {
    const rvu = { ...rvu99213, workRvuX100: 0, nonfacilityPeRvuX100: 0, malpracticeRvuX100: 0 };
    expect(medicarePriceCents({ rvu, gpci: gpciLA, placeOfService: "office" })).toBe(0);
  });
});
