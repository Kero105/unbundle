import type { Gpci, MpfsRvu } from "./medicare-price";

/** Los Angeles locality, the only GPCI row the rules use for now. */
export const LA_MAC_CODE = "01182";
export const LA_LOCALITY_NUMBER = "18";

/** NCCI PTP edit set 1 = practitioner (2 = hospital outpatient). */
export const PTP_EDIT_SET_PRACTITIONER = 1;
export const MUE_SERVICE_TYPE_PRACTITIONER = "practitioner";

/** One ncci_ptp row (with its rationale text). Dates are ISO `YYYY-MM-DD`. */
export interface PtpEdit {
  column1Code: string;
  column2Code: string;
  effectiveDate: string;
  /** Last day the edit applies (inclusive), or null if still active. */
  deletionDate: string | null;
  /** 0 = modifier never bypasses the edit, 1 = a modifier may bypass it. */
  modifierIndicator: 0 | 1;
  rationale: string;
}

/** One ncci_mue row for service_type 'practitioner'. */
export interface Mue {
  code: string;
  mueValue: number;
  adjudicationIndicator: 1 | 2 | 3;
  adjudicationText: string;
  rationale: string;
}

/** The rate row plus the LA GPCI row, ready for `medicarePriceCents`. */
export interface RateLookup {
  rvu: MpfsRvu;
  gpci: Gpci;
}

/**
 * Reference-data access for rules. Every method is an exact-key lookup; there is
 * no way to list or scan a table. Async because the production implementation
 * queries the database.
 */
export interface RulesLookups {
  /**
   * Practitioner (edit_set 1) edits for the ordered pair (code1 = column 1,
   * code2 = column 2) that are active on `dateOfService` (`YYYY-MM-DD`):
   * effective_date <= date and (deletion_date is null or deletion_date >= date).
   * Empty when none. Ordered by effective date.
   */
  getPtpEdits(code1: string, code2: string, dateOfService: string): Promise<PtpEdit[]>;

  /** Practitioner MUE for the code, or null if it has none. */
  getMue(code: string): Promise<Mue | null>;

  /**
   * The mpfs_rates row for exactly (code, modifier) — "" means no modifier, and
   * there is no fallback to the unmodified row — with the standard conversion
   * factor (never the QPP one) and the LA GPCI row. Null when there is no such
   * rate row.
   */
  getRate(code: string, modifier: string): Promise<RateLookup | null>;
}
