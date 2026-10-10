export type PlaceOfService = "office" | "facility";

/** One mpfs_rates row, in the scaled integers the table stores. */
export interface MpfsRvu {
  statusCode: string;
  workRvuX100: number;
  nonfacilityPeRvuX100: number;
  facilityPeRvuX100: number;
  malpracticeRvuX100: number;
  nonfacilityPeNa: boolean;
  facilityPeNa: boolean;
  conversionFactorX10000: number;
}

/** One gpci row. The work value is the no-floor one (see 0003 migration). */
export interface Gpci {
  workGpciNofloorX1000: number;
  peGpciX1000: number;
  mpGpciX1000: number;
}

/**
 * Medicare Physician Fee Schedule allowed amount in integer cents, or null when
 * the code has no payable price (status code not 'A', or the PE RVU for the
 * place of service is flagged NA).
 *
 * s = work*workGpci + pe*peGpci + mp*mpGpci   (units: 1e-5 RVU)
 * cents = round_half_up(s * CF_x10000 / 1e7)
 * The product stays below 2^53, so everything is exact integer math.
 */
export function medicarePriceCents({
  rvu,
  gpci,
  placeOfService,
}: {
  rvu: MpfsRvu;
  gpci: Gpci;
  placeOfService: PlaceOfService;
}): number | null {
  if (rvu.statusCode !== "A") return null;

  const facility = placeOfService === "facility";
  if (facility ? rvu.facilityPeNa : rvu.nonfacilityPeNa) return null;
  const peX100 = facility ? rvu.facilityPeRvuX100 : rvu.nonfacilityPeRvuX100;

  const s =
    rvu.workRvuX100 * gpci.workGpciNofloorX1000 +
    peX100 * gpci.peGpciX1000 +
    rvu.malpracticeRvuX100 * gpci.mpGpciX1000;

  return Math.floor((s * rvu.conversionFactorX10000 + 5_000_000) / 10_000_000);
}
