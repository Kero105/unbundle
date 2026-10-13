import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ExtractedBillSchema } from "@/lib/types";
import { runRules } from "@/lib/rules";
import { createInMemoryLookups } from "@/lib/rules/in-memory-lookups";
import { CENTS_LIMIT, MAX_DESCRIPTION_LENGTH, MAX_MODIFIERS, MAX_UNITS } from "./line-item-fields";
import {
  CPT_PATTERNS,
  HCPCS_PATTERN,
  MANUAL_CODE_PATTERN,
  MANUAL_HEADER_KEYS,
  MANUAL_LINE_KEYS,
  MANUAL_MIN_DATE,
  MAX_MANUAL_LINES,
  MAX_PROVIDER_LENGTH,
  deriveCodeType,
  interpretManualSubmit,
  manualBillInputSchema,
  parseManualBill,
  toExtractedBill,
  MANUAL_RPC_ERRORS,
} from "./manual-entry";

const TODAY = "2026-10-12";

const goodLine = {
  dateOfService: "2026-10-02",
  code: "99214",
  descriptionRaw: "SYNTHETIC OFFICE VISIT",
  modifiers: [] as string[],
  units: 1,
  unitPriceCents: 22000,
  chargeCents: 22000,
};
const goodHeader = {
  providerName: "Synthetic Clinic",
  serviceStart: "2026-10-02",
  serviceEnd: "2026-10-02",
};
const input = (overrides: Record<string, unknown> = {}) => ({
  header: goodHeader,
  lines: [goodLine],
  ...overrides,
});
const ok = (value: unknown) => parseManualBill(value, TODAY).ok;

describe("parseManualBill", () => {
  it("accepts a minimal valid bill and normalizes the code", () => {
    const r = parseManualBill(input({ lines: [{ ...goodLine, code: " 99214 " }] }), TODAY);
    expect(r.ok && r.value.lines[0].code).toBe("99214");
    const lower = parseManualBill(input({ lines: [{ ...goodLine, code: "j3490" }] }), TODAY);
    expect(lower.ok && lower.value.lines[0].code).toBe("J3490");
  });

  it("allows no dates, no code, no unit price, and a zero or negative charge", () => {
    expect(ok(input({ header: { ...goodHeader, serviceStart: null, serviceEnd: null } }))).toBe(true);
    expect(
      ok(
        input({
          lines: [
            { ...goodLine, dateOfService: null, code: null, unitPriceCents: null, chargeCents: 0 },
            { ...goodLine, chargeCents: -500 },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("requires 1 to 100 lines", () => {
    expect(ok(input({ lines: [] }))).toBe(false);
    expect(ok(input({ lines: Array(MAX_MANUAL_LINES).fill(goodLine) }))).toBe(true);
    expect(ok(input({ lines: Array(MAX_MANUAL_LINES + 1).fill(goodLine) }))).toBe(false);
  });

  it("rejects non-integer, non-number and out-of-range cents", () => {
    for (const chargeCents of [1.5, "10", Number.NaN, CENTS_LIMIT + 1, -CENTS_LIMIT - 1]) {
      expect(ok(input({ lines: [{ ...goodLine, chargeCents }] }))).toBe(false);
    }
    expect(ok(input({ lines: [{ ...goodLine, chargeCents: CENTS_LIMIT }] }))).toBe(true);
    expect(ok(input({ lines: [{ ...goodLine, unitPriceCents: 0.5 }] }))).toBe(false);
  });

  it("rejects bad units", () => {
    for (const units of [0, -1, 2.5, MAX_UNITS + 1]) {
      expect(ok(input({ lines: [{ ...goodLine, units }] }))).toBe(false);
    }
    expect(ok(input({ lines: [{ ...goodLine, units: MAX_UNITS }] }))).toBe(true);
  });

  it("rejects bad or out-of-window dates", () => {
    for (const dateOfService of ["2026-02-30", "10/02/2026", MANUAL_MIN_DATE.replace("2000", "1999"), "2026-10-14"]) {
      expect(ok(input({ lines: [{ ...goodLine, dateOfService }] }))).toBe(false);
    }
    // Boundaries: the minimum day and tomorrow are allowed.
    expect(ok(input({ lines: [{ ...goodLine, dateOfService: MANUAL_MIN_DATE }] }))).toBe(true);
    expect(ok(input({ lines: [{ ...goodLine, dateOfService: "2026-10-13" }] }))).toBe(true);
  });

  it("requires service dates in pairs and in order", () => {
    expect(ok(input({ header: { ...goodHeader, serviceEnd: null } }))).toBe(false);
    expect(ok(input({ header: { ...goodHeader, serviceStart: "2026-10-05", serviceEnd: "2026-10-01" } }))).toBe(false);
    expect(ok(input({ header: { ...goodHeader, serviceStart: "2026-10-01", serviceEnd: "2026-10-05" } }))).toBe(true);
  });

  it("rejects bad codes", () => {
    for (const code of ["", "  ", "AB", "ABCDEFGHIJK", "99 214", "99-214", "99214; DROP"]) {
      expect(ok(input({ lines: [{ ...goodLine, code }] }))).toBe(false);
    }
    expect(ok(input({ lines: [{ ...goodLine, code: "0450" }] }))).toBe(true); // revenue code
    expect(ok(input({ lines: [{ ...goodLine, code: "470" }] }))).toBe(true); // DRG
  });

  it("rejects bad modifiers", () => {
    const bad = [["5"], ["abc"], ["xs"], ["25", "25"], Array(MAX_MODIFIERS + 1).fill(0).map((_, i) => `A${i}`)];
    for (const modifiers of bad) {
      expect(ok(input({ lines: [{ ...goodLine, modifiers }] }))).toBe(false);
    }
    expect(ok(input({ lines: [{ ...goodLine, modifiers: ["25", "59"] }] }))).toBe(true);
  });

  it("rejects blank, over-long and control-character text", () => {
    for (const descriptionRaw of ["", "   ", "x".repeat(MAX_DESCRIPTION_LENGTH + 1), "a\u0000b", "a\nb"]) {
      expect(ok(input({ lines: [{ ...goodLine, descriptionRaw }] }))).toBe(false);
    }
    expect(ok(input({ lines: [{ ...goodLine, descriptionRaw: "x".repeat(MAX_DESCRIPTION_LENGTH) }] }))).toBe(true);
    for (const providerName of ["", " ", "x".repeat(MAX_PROVIDER_LENGTH + 1)]) {
      expect(ok(input({ header: { ...goodHeader, providerName } }))).toBe(false);
    }
  });

  it("rejects keys a person may not set, on the line, header and top level", () => {
    for (const extra of [{ confidence: "low" }, { userVerified: false }, { userId: "x" }, { sourceBox: null }]) {
      expect(ok(input({ lines: [{ ...goodLine, ...extra }] }))).toBe(false);
    }
    expect(ok(input({ header: { ...goodHeader, totalBilledCents: 1 } }))).toBe(false);
    expect(ok({ ...input(), extraTopLevel: true })).toBe(false);
    expect(ok({ ...input(), billId: "not-a-uuid" })).toBe(false);
    expect(ok({ ...input(), billId: "8f3c2c0e-5b6c-4f67-9a43-6f2f5d3a1b11" })).toBe(true);
  });

  it("rejects missing required fields", () => {
    for (const missing of ["chargeCents", "descriptionRaw", "units"] as const) {
      const line: Record<string, unknown> = { ...goodLine };
      delete line[missing];
      expect(ok(input({ lines: [line] }))).toBe(false);
    }
  });

  it("handles a clock at a month boundary", () => {
    const schema = manualBillInputSchema("2026-12-31");
    const withDate = (d: string) => schema.safeParse(input({ lines: [{ ...goodLine, dateOfService: d }] })).success;
    expect(withDate("2027-01-01")).toBe(true);
    expect(withDate("2027-01-02")).toBe(false);
  });
});

describe("deriveCodeType", () => {
  it("matches the shapes the explain validator treats as CPT and HCPCS", () => {
    expect(deriveCodeType("99214")).toBe("CPT");
    expect(deriveCodeType("0042T")).toBe("CPT");
    expect(deriveCodeType("J3490")).toBe("HCPCS");
    expect(deriveCodeType("0450")).toBe("OTHER");
    expect(deriveCodeType("470")).toBe("OTHER");
    expect(deriveCodeType(null)).toBeNull();
  });
});

describe("toExtractedBill", () => {
  it("produces a valid ExtractedBill with a derived total and no payment data", () => {
    const parsed = parseManualBill(
      input({ lines: [goodLine, { ...goodLine, code: "93000", chargeCents: 5000, unitPriceCents: 5000 }] }),
      TODAY,
    );
    if (!parsed.ok) throw new Error("fixture invalid");
    const bill = toExtractedBill(parsed.value);
    expect(ExtractedBillSchema.safeParse(bill).success).toBe(true);
    expect(bill.totalBilledCents).toBe(27000);
    expect(bill.eobLines).toEqual([]);
    expect(bill.lineItems.map((l) => l.id)).toEqual(["li-1", "li-2"]);
    for (const l of bill.lineItems) {
      expect(l).toMatchObject({
        confidence: "high",
        userVerified: true,
        sourceBox: null,
        insurancePaidCents: null,
        patientOwesCents: null,
      });
    }
  });
});

describe("interpretManualSubmit", () => {
  it("returns null for submitted and passes known codes through", () => {
    expect(interpretManualSubmit("submitted")).toBeNull();
    for (const code of MANUAL_RPC_ERRORS) expect(interpretManualSubmit(code)).toBe(code);
  });

  it("treats anything else as save_failed", () => {
    for (const result of [null, undefined, 1, {}, "ok", "claimed", "weird"]) {
      expect(interpretManualSubmit(result)).toBe("save_failed");
    }
  });
});

describe("rules parity with extracted bills", () => {
  const root = path.join(__dirname, "../../../fixtures");
  const names = fs
    .readdirSync(path.join(root, "bills"))
    .filter((f) => f.endsWith(".json"))
    .sort();
  const read = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(root, ...p), "utf8"));

  // Synthetic reference data, enough to make the database-backed rules fire.
  const lookups = createInMemoryLookups({
    ptpEdits: [
      { column1Code: "80053", column2Code: "80048", effectiveDate: "2000-01-01", deletionDate: null, modifierIndicator: 0, rationale: "synthetic" },
      { column1Code: "20610", column2Code: "99214", effectiveDate: "2000-01-01", deletionDate: null, modifierIndicator: 1, rationale: "synthetic" },
    ],
    mues: [
      { code: "97140", mueValue: 6, adjudicationIndicator: 2, adjudicationText: "synthetic", rationale: "synthetic" },
    ],
  });

  const summarize = (findings: { ruleId: string; lineItemIds: string[]; amountAtStakeCents: number }[]) =>
    findings.map((f) => ({ ruleId: f.ruleId, lineItemIds: f.lineItemIds, amountAtStakeCents: f.amountAtStakeCents }));

  function manualInputFrom(bill: ReturnType<typeof read>) {
    return {
      header: {
        providerName: bill.providerName,
        serviceStart: bill.serviceStart,
        serviceEnd: bill.serviceEnd,
      },
      lines: bill.lineItems.map((l: Record<string, unknown>) => ({
        dateOfService: l.dateOfService,
        code: l.code,
        descriptionRaw: l.descriptionRaw,
        modifiers: l.modifiers ?? [],
        units: l.units,
        unitPriceCents: l.unitPriceCents,
        chargeCents: l.chargeCents,
      })),
    };
  }

  const usesPayments = (bill: ReturnType<typeof read>) =>
    bill.eobLines?.length > 0 ||
    bill.lineItems.some((l: Record<string, unknown>) => l.insurancePaidCents !== null || l.patientOwesCents !== null);

  it.each(names)("%s gives the same findings typed in as extracted", async (file) => {
    const fixture = ExtractedBillSchema.parse(read("bills", file));
    const parsed = parseManualBill(manualInputFrom(fixture), "2026-12-31");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const typed = toExtractedBill(parsed.value);
    // Same code type the extraction produced, or price_outlier would go quiet.
    typed.lineItems.forEach((l, i) => expect(l.codeType).toBe(fixture.lineItems[i].codeType));

    // Payments and EOB lines are not collected by hand, so compare against the
    // fixture with those removed.
    const comparable = usesPayments(fixture)
      ? {
          ...fixture,
          eobLines: [],
          lineItems: fixture.lineItems.map((l) => ({ ...l, insurancePaidCents: null, patientOwesCents: null })),
        }
      : fixture;

    const [fromTyped, fromFixture] = await Promise.all([
      runRules(typed, lookups),
      runRules(comparable, lookups),
    ]);
    expect(summarize(fromTyped)).toEqual(summarize(fromFixture));

    // And, for bills that need no payment data, the expected file still holds
    // for the rules that don't depend on reference data.
    if (!usesPayments(fixture)) {
      const pure = new Set(["duplicate_charge", "math_error", "date_mismatch", "vague_charge"]);
      const expected = read("expected", file).expectedFindings.filter((f: { ruleId: string }) => pure.has(f.ruleId));
      const got = summarize(fromTyped).filter((f) => pure.has(f.ruleId));
      const key = (f: { ruleId: string; lineItemIds: string[]; amountAtStakeCents: number }) =>
        `${f.ruleId}|${[...f.lineItemIds].sort().join(",")}|${f.amountAtStakeCents}`;
      expect(got.map(key).sort()).toEqual(expected.map(key).sort());
    }
  });

  it("the reference-data rules actually fire in this parity setup", async () => {
    const run = async (prefix: string) => {
      const file = names.find((n) => n.startsWith(prefix))!;
      const parsed = parseManualBill(manualInputFrom(read("bills", file)), "2026-12-31");
      if (!parsed.ok) throw new Error("fixture invalid");
      return (await runRules(toExtractedBill(parsed.value), lookups)).map((f) => f.ruleId);
    };
    expect(await run("bill-04")).toContain("ncci_unbundling");
    expect(await run("bill-06")).toContain("mue_exceeded");
  });
});

describe("migration 0006 stays in step with the TypeScript bounds", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "../../../supabase/migrations/0006_manual_entry.sql"),
    "utf8",
  );
  const posix = (re: RegExp) => re.source.replaceAll("\\d", "[0-9]");

  it("uses the same patterns", () => {
    expect(sql).toContain(posix(MANUAL_CODE_PATTERN));
    for (const p of CPT_PATTERNS) expect(sql).toContain(posix(p));
    expect(sql).toContain(posix(HCPCS_PATTERN));
    expect(sql).toContain("'^[A-Z0-9]{2}$'"); // modifiers
  });

  it("uses the same limits", () => {
    expect(sql).toContain(`max_lines constant int := ${MAX_MANUAL_LINES}`);
    expect(sql).toContain(`max_modifiers constant int := ${MAX_MODIFIERS}`);
    expect(sql).toContain(`max_cents constant numeric := ${CENTS_LIMIT}`);
    expect(sql).toContain(`> ${MAX_DESCRIPTION_LENGTH} or`);
    expect(sql).toContain(`> ${MAX_PROVIDER_LENGTH}`);
    expect(sql).toContain(`> ${MAX_UNITS}`);
    expect(sql).toContain(`date '${MANUAL_MIN_DATE}'`);
  });

  it("allows exactly the same keys", () => {
    const flat = sql.replace(/\s+/g, "");
    const list = (keys: readonly string[]) => `array[${keys.map((k) => `'${k}'`).join(",")}]`;
    expect(flat).toContain(list(MANUAL_HEADER_KEYS));
    expect(flat).toContain(list(MANUAL_LINE_KEYS));
  });
});

describe("migration 0006 guards each hostile input before any write", () => {
  const sql = fs
    .readFileSync(path.join(__dirname, "../../../supabase/migrations/0006_manual_entry.sql"), "utf8")
    .replace(/\s+/g, " ");
  const writeAt = sql.indexOf("delete from public.line_items");

  // [description, the guard, the code it returns]
  const guards: [string, string, string][] = [
    ["caller not signed in", "if uid is null then return 'unauthenticated'", "unauthenticated"],
    ["null bill id", "if p_bill_id is null then return 'not_found'", "not_found"],
    ["null or non-object header", "p_header is null or jsonb_typeof(p_header) <> 'object'", "bad_payload"],
    ["null or non-array lines", "p_lines is null or jsonb_typeof(p_lines) <> 'array'", "bad_payload"],
    ["no lines", "if n = 0 then return 'no_lines'", "no_lines"],
    ["too many lines", "if n > max_lines then return 'too_many_lines'", "too_many_lines"],
    ["bill not owned or missing", "if not found then return 'not_found'", "not_found"],
    ["fresh extraction", "return 'busy'", "busy"],
    ["extracted bill already reviewed", "<> 'manual' then return 'already_done'", "already_done"],
    ["unknown header key", "from jsonb_object_keys(p_header) k where k <> all (header_keys)", "bad_payload"],
    ["non-string provider", "jsonb_typeof(p_header -> 'providerName') is distinct from 'string'", "bad_header"],
    ["one date of a pair", "if (v_start is null) <> (v_end is null) then return 'bad_header'", "bad_header"],
    ["end before start", "if v_start > v_end then return 'bad_date'", "bad_date"],
    ["impossible date", "exception when others then return 'bad_date'", "bad_date"],
    ["line is not an object", "if jsonb_typeof(el) <> 'object' then return 'bad_payload'", "bad_payload"],
    ["unknown line key", "from jsonb_object_keys(el) k where k <> all (line_keys)", "bad_payload"],
    ["units not a number", "jsonb_typeof(el -> 'units') is distinct from 'number'", "bad_units"],
    ["units fractional or out of range", "num <> trunc(num) or num < 1 or num > 100000", "bad_units"],
    ["charge not a number", "jsonb_typeof(el -> 'chargeCents') is distinct from 'number'", "bad_cents"],
    ["charge fractional or over 1e12", "num <> trunc(num) or abs(num) > max_cents", "bad_cents"],
    ["modifiers not an array", "if jsonb_typeof(el -> 'modifiers') <> 'array' then return 'bad_modifier'", "bad_modifier"],
  ];

  it.each(guards)("%s", (_name, guard, code) => {
    const at = sql.indexOf(guard);
    expect(at, `guard not found: ${guard}`).toBeGreaterThan(-1);
    expect(at).toBeLessThan(writeAt); // before the first write
    expect(sql).toContain(`'${code}'`);
  });

  it("only writes after the last validation return", () => {
    const lastReturn = sql.lastIndexOf("return 'bad_");
    expect(lastReturn).toBeGreaterThan(-1);
    expect(lastReturn).toBeLessThan(writeAt);
  });
});

