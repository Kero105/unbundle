import {
  LA_LOCALITY_NUMBER,
  LA_MAC_CODE,
  type Mue,
  type PtpEdit,
  type RateLookup,
  type RulesLookups,
} from "./lookups";
import type { Gpci, MpfsRvu } from "./medicare-price";

export interface InMemoryLookupData {
  ptpEdits?: PtpEdit[];
  mues?: Mue[];
  /** Keyed by code; the modifier defaults to "" (no modifier). */
  rates?: { code: string; modifier?: string; rvu: MpfsRvu }[];
  gpci?: Gpci;
}

/** Test double for RulesLookups with the same exact-key semantics as the DB adapter. */
export function createInMemoryLookups(data: InMemoryLookupData = {}): RulesLookups {
  const ptpEdits = data.ptpEdits ?? [];
  const mues = new Map((data.mues ?? []).map((m) => [m.code, m]));
  const rates = new Map(
    (data.rates ?? []).map((r) => [JSON.stringify([r.code, r.modifier ?? ""]), r.rvu]),
  );

  return {
    async getPtpEdits(code1, code2, dateOfService) {
      return ptpEdits
        .filter(
          (e) =>
            e.column1Code === code1 &&
            e.column2Code === code2 &&
            e.effectiveDate <= dateOfService &&
            (e.deletionDate === null || e.deletionDate >= dateOfService),
        )
        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    },

    async getMue(code) {
      return mues.get(code) ?? null;
    },

    async getRate(code, modifier): Promise<RateLookup | null> {
      const rvu = rates.get(JSON.stringify([code, modifier]));
      if (!rvu) return null;
      if (!data.gpci) {
        throw new Error(`gpci row missing for mac ${LA_MAC_CODE} locality ${LA_LOCALITY_NUMBER}`);
      }
      return { rvu, gpci: data.gpci };
    },
  };
}
