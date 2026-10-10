import { z } from "zod";
import type { RulesLookups } from "@/lib/rules/lookups";

const PtpEditSchema = z.object({
  column1Code: z.string(),
  column2Code: z.string(),
  effectiveDate: z.string(),
  deletionDate: z.string().nullable(),
  modifierIndicator: z.union([z.literal(0), z.literal(1)]),
  rationale: z.string(),
});

const MueSchema = z.object({
  code: z.string(),
  mueValue: z.number().int(),
  adjudicationIndicator: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  adjudicationText: z.string(),
  rationale: z.string(),
});

const RateLookupSchema = z.object({
  rvu: z.object({
    statusCode: z.string(),
    workRvuX100: z.number().int(),
    nonfacilityPeRvuX100: z.number().int(),
    facilityPeRvuX100: z.number().int(),
    malpracticeRvuX100: z.number().int(),
    nonfacilityPeNa: z.boolean(),
    facilityPeNa: z.boolean(),
    conversionFactorX10000: z.number().int(),
  }),
  gpci: z.object({
    workGpciNofloorX1000: z.number().int(),
    peGpciX1000: z.number().int(),
    mpGpciX1000: z.number().int(),
  }),
});

const PovertyRowSchema = z.object({
  guidelineYear: z.number().int(),
  region: z.enum(["contiguous", "AK", "HI"]),
  householdSize: z.number().int().min(1).max(8),
  povertyLineCents: z.number().int().positive(),
  perAdditionalPersonCents: z.number().int().positive(),
});

/**
 * The public reference data the sample bill needs, recorded once from the
 * reference tables by `scripts/precompute-demo-findings.ts`. Every rules lookup
 * the demo bill makes is stored with its exact key and result, so the rules can
 * be replayed offline and compared against the committed findings.
 */
export const DemoReferenceSchema = z.object({
  rules: z.object({
    ptp: z.array(
      z.object({
        code1: z.string(),
        code2: z.string(),
        date: z.string(),
        edits: z.array(PtpEditSchema),
      }),
    ),
    mue: z.array(z.object({ code: z.string(), mue: MueSchema.nullable() })),
    rate: z.array(
      z.object({ code: z.string(), modifier: z.string(), rate: RateLookupSchema.nullable() }),
    ),
  }),
  poverty: z.object({
    guidelineYear: z.number().int(),
    rows: z.array(PovertyRowSchema).min(1),
  }),
});

export type DemoReference = z.infer<typeof DemoReferenceSchema>;
export type DemoRulesRecording = DemoReference["rules"];

/**
 * RulesLookups over a recording. An unrecorded key throws (with the key's
 * shape, never bill contents beyond the code) so a changed demo bill fails
 * loudly instead of silently returning "no edit".
 */
export function createReplayLookups(rules: DemoRulesRecording): RulesLookups {
  return {
    async getPtpEdits(code1, code2, dateOfService) {
      const hit = rules.ptp.find(
        (r) => r.code1 === code1 && r.code2 === code2 && r.date === dateOfService,
      );
      if (!hit) throw new Error("demo reference snapshot is missing a PTP lookup; re-run the precompute script");
      return hit.edits;
    },
    async getMue(code) {
      const hit = rules.mue.find((r) => r.code === code);
      if (!hit) throw new Error("demo reference snapshot is missing an MUE lookup; re-run the precompute script");
      return hit.mue;
    },
    async getRate(code, modifier) {
      const hit = rules.rate.find((r) => r.code === code && r.modifier === modifier);
      if (!hit) throw new Error("demo reference snapshot is missing a rate lookup; re-run the precompute script");
      return hit.rate;
    },
  };
}

/** Wraps real lookups and records every call, for the precompute script. */
export function recordLookups(inner: RulesLookups): { lookups: RulesLookups; rules: DemoRulesRecording } {
  const rules: DemoRulesRecording = { ptp: [], mue: [], rate: [] };
  const lookups: RulesLookups = {
    async getPtpEdits(code1, code2, date) {
      const edits = await inner.getPtpEdits(code1, code2, date);
      if (!rules.ptp.some((r) => r.code1 === code1 && r.code2 === code2 && r.date === date)) {
        rules.ptp.push({ code1, code2, date, edits });
      }
      return edits;
    },
    async getMue(code) {
      const mue = await inner.getMue(code);
      if (!rules.mue.some((r) => r.code === code)) rules.mue.push({ code, mue });
      return mue;
    },
    async getRate(code, modifier) {
      const rate = await inner.getRate(code, modifier);
      if (!rules.rate.some((r) => r.code === code && r.modifier === modifier)) {
        rules.rate.push({ code, modifier, rate });
      }
      return rate;
    },
  };
  return { lookups, rules };
}
