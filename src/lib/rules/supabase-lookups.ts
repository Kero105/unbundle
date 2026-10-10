import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  LA_LOCALITY_NUMBER,
  LA_MAC_CODE,
  MUE_SERVICE_TYPE_PRACTITIONER,
  PTP_EDIT_SET_PRACTITIONER,
  type Mue,
  type PtpEdit,
  type RateLookup,
  type RulesLookups,
} from "./lookups";

/**
 * Upper bound for the one multi-row query. A code pair has at most a handful of
 * edits (primary key includes effective_date); hitting this means bad data, and
 * we throw rather than silently truncate.
 */
const PTP_MAX_ROWS = 50;

const CODE = /^[A-Za-z0-9]{5}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const PtpRowSchema = z.object({
  column1_code: z.string(),
  column2_code: z.string(),
  effective_date: z.string(),
  deletion_date: z.string().nullable(),
  modifier_indicator: z.union([z.literal(0), z.literal(1)]),
  // Embedded many-to-one; PostgREST returns an object (or an array for older clients).
  ncci_ptp_rationale: z.union([
    z.object({ rationale: z.string() }),
    z.array(z.object({ rationale: z.string() })).length(1).transform((a) => a[0]),
  ]),
});

const MueRowSchema = z.object({
  code: z.string(),
  mue_value: z.number().int(),
  adjudication_indicator: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  adjudication_text: z.string(),
  rationale: z.string(),
});

const RateRowSchema = z.object({
  status_code: z.string(),
  work_rvu_x100: z.number().int(),
  nonfacility_pe_rvu_x100: z.number().int(),
  facility_pe_rvu_x100: z.number().int(),
  malpractice_rvu_x100: z.number().int(),
  nonfacility_pe_na: z.boolean(),
  facility_pe_na: z.boolean(),
  conversion_factor_x10000: z.number().int().positive(),
});

const GpciRowSchema = z.object({
  work_gpci_nofloor_x1000: z.number().int(),
  pe_gpci_x1000: z.number().int(),
  mp_gpci_x1000: z.number().int(),
});

/** Error text carries the table and Postgres error code only, never query values. */
function fail(table: string, what: string, code?: string): never {
  throw new Error(`reference lookup failed: ${table} ${what}${code ? ` (${code})` : ""}`);
}

/**
 * RulesLookups backed by the reference tables. Every query pins the full primary
 * key (or, for PTP, edit_set + both codes with a date predicate), so it returns
 * at most one row — or a small, explicitly limited set — and never depends on
 * the 1,000-row default response limit. Works with the user-scoped client:
 * reference tables are readable by `authenticated`.
 */
export function createSupabaseLookups(client: SupabaseClient): RulesLookups {
  return {
    async getPtpEdits(code1, code2, dateOfService): Promise<PtpEdit[]> {
      // Non-5-character codes can't be in the table. The date is interpolated
      // into an or() filter, so it must be a strict ISO date.
      if (!CODE.test(code1) || !CODE.test(code2) || !ISO_DATE.test(dateOfService)) return [];

      const { data, error } = await client
        .from("ncci_ptp")
        .select(
          "column1_code, column2_code, effective_date, deletion_date, modifier_indicator, ncci_ptp_rationale(rationale)",
        )
        .eq("edit_set", PTP_EDIT_SET_PRACTITIONER)
        .eq("column1_code", code1)
        .eq("column2_code", code2)
        .lte("effective_date", dateOfService)
        .or(`deletion_date.is.null,deletion_date.gte.${dateOfService}`)
        .order("effective_date", { ascending: true })
        .limit(PTP_MAX_ROWS);
      if (error) fail("ncci_ptp", "query", error.code);
      if (data.length >= PTP_MAX_ROWS) fail("ncci_ptp", "returned too many rows");

      return data.map((raw) => {
        const row = PtpRowSchema.safeParse(raw);
        if (!row.success) fail("ncci_ptp", "row failed validation");
        const r = row.data;
        return {
          column1Code: r.column1_code,
          column2Code: r.column2_code,
          effectiveDate: r.effective_date,
          deletionDate: r.deletion_date,
          modifierIndicator: r.modifier_indicator,
          rationale: r.ncci_ptp_rationale.rationale,
        };
      });
    },

    async getMue(code): Promise<Mue | null> {
      if (!CODE.test(code)) return null;

      const { data, error } = await client
        .from("ncci_mue")
        .select("code, mue_value, adjudication_indicator, adjudication_text, rationale")
        .eq("code", code)
        .eq("service_type", MUE_SERVICE_TYPE_PRACTITIONER)
        .maybeSingle();
      if (error) fail("ncci_mue", "query", error.code);
      if (!data) return null;

      const row = MueRowSchema.safeParse(data);
      if (!row.success) fail("ncci_mue", "row failed validation");
      const r = row.data;
      return {
        code: r.code,
        mueValue: r.mue_value,
        adjudicationIndicator: r.adjudication_indicator,
        adjudicationText: r.adjudication_text,
        rationale: r.rationale,
      };
    },

    async getRate(code, modifier): Promise<RateLookup | null> {
      if (!CODE.test(code)) return null;

      const rateRes = await client
        .from("mpfs_rates")
        .select(
          "status_code, work_rvu_x100, nonfacility_pe_rvu_x100, facility_pe_rvu_x100, malpractice_rvu_x100, nonfacility_pe_na, facility_pe_na, conversion_factor_x10000",
        )
        .eq("hcpcs_code", code)
        .eq("modifier", modifier)
        .maybeSingle();
      if (rateRes.error) fail("mpfs_rates", "query", rateRes.error.code);
      if (!rateRes.data) return null;

      const gpciRes = await client
        .from("gpci")
        .select("work_gpci_nofloor_x1000, pe_gpci_x1000, mp_gpci_x1000")
        .eq("mac_code", LA_MAC_CODE)
        .eq("locality_number", LA_LOCALITY_NUMBER)
        .maybeSingle();
      if (gpciRes.error) fail("gpci", "query", gpciRes.error.code);
      if (!gpciRes.data) fail("gpci", "row missing for LA locality");

      const rate = RateRowSchema.safeParse(rateRes.data);
      if (!rate.success) fail("mpfs_rates", "row failed validation");
      const gpci = GpciRowSchema.safeParse(gpciRes.data);
      if (!gpci.success) fail("gpci", "row failed validation");

      const r = rate.data;
      return {
        rvu: {
          statusCode: r.status_code,
          workRvuX100: r.work_rvu_x100,
          nonfacilityPeRvuX100: r.nonfacility_pe_rvu_x100,
          facilityPeRvuX100: r.facility_pe_rvu_x100,
          malpracticeRvuX100: r.malpractice_rvu_x100,
          nonfacilityPeNa: r.nonfacility_pe_na,
          facilityPeNa: r.facility_pe_na,
          conversionFactorX10000: r.conversion_factor_x10000,
        },
        gpci: {
          workGpciNofloorX1000: gpci.data.work_gpci_nofloor_x1000,
          peGpciX1000: gpci.data.pe_gpci_x1000,
          mpGpciX1000: gpci.data.mp_gpci_x1000,
        },
      };
    },
  };
}
