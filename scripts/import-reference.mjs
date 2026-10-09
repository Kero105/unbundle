// Imports the CMS reference tables into Supabase using the service role key.
// Local use only. Safe to re-run: every write is an upsert on the primary key.
//
//   node scripts/import-reference.mjs --stage=small   rationale, mue, gpci, mpfs_rates
//   node scripts/import-reference.mjs --stage=ptp     ncci_ptp (~1.76M rows)
//   node scripts/import-reference.mjs --stage=all
//
// Output is progress counts only. Exits non-zero on any validation failure or if
// final row counts differ from the expected values.
import fs from "node:fs";
import { serviceClient } from "./lib/env.mjs";
import { BATCH_SIZE, rowCount, upsertAll, upsertBatch, verifyCounts } from "./lib/db.mjs";
import { blankToNull, parseCsv, scaled, splitAdjudication, ymd } from "./lib/parse.mjs";

const EXPECTED = { ncci_ptp: 1_761_922, ncci_mue: 15_212, gpci: 109, mpfs_rates: 19_226 };
const PTP_RELEASE = "NCCI-2026Q4";
const MUE_RELEASE = "NCCI-MUE-2026Q4";
const RVU_RELEASE = "RVU26A";
const PTP_FILES = ["ccipra-v323r0-f1.TXT", "ccipra-v323r0-f2.TXT", "ccipra-v323r0-f3.txt", "ccipra-v323r0-f4.txt"];
const MIN_DELETION = "2024-01-01";
const fmt = (n) => n.toLocaleString("en-US");
const CODE = /^[0-9A-Z]{5}$/;

function fail(msg) {
  throw new Error(msg);
}

// ---------------------------------------------------------------------------
// ncci_ptp_rationale
// ---------------------------------------------------------------------------
async function loadRationales(db, strings) {
  const rows = [...strings].sort().map((rationale) => ({ rationale, source_release: PTP_RELEASE }));
  await upsertAll(db, "ncci_ptp_rationale", rows, "rationale");
  const { data, error } = await db.from("ncci_ptp_rationale").select("id, rationale");
  if (error) fail(`ncci_ptp_rationale: select failed (code=${error.code})`);
  const ids = new Map(data.map((r) => [r.rationale, r.id]));
  for (const s of strings) if (!ids.has(s)) fail("ncci_ptp_rationale: missing id after upsert");
  return ids;
}

/** Parses one PTP file into row arrays, applying the import filters. */
function* readPtpFile(file, stats) {
  const text = fs.readFileSync(`data/ptp/${file}`, "latin1");
  for (const line of text.split("\n")) {
    const c = line.replace(/\r$/, "").split("\t");
    if (!CODE.test(c[0] ?? "")) continue; // preamble / blank lines
    if (c.length !== 7) fail(`${file}: unexpected column count`);
    const [col1, col2, , eff, del, mod, rationale] = c;
    if (!CODE.test(col2)) fail(`${file}: bad column 2 code`);
    stats.read++;
    if (mod === "9") {
      stats.skippedModifier9++;
      continue;
    }
    if (mod !== "0" && mod !== "1") fail(`${file}: unexpected modifier indicator`);
    const effective = ymd(eff, "effective date");
    if (effective === null) fail(`${file}: missing effective date`);
    const deleted = ymd(del, "deletion date");
    if (deleted !== null && deleted < MIN_DELETION) {
      stats.skippedOldDeletion++;
      continue;
    }
    if (deleted !== null && deleted < effective) fail(`${file}: deletion date before effective date`);
    if (!rationale) fail(`${file}: blank rationale`);
    yield { col1, col2, effective, deleted, modifier: Number(mod), rationale };
  }
}

async function importPtp(db) {
  // Pass 1: collect distinct rationales so ids exist before edits are written.
  const stats = { read: 0, skippedModifier9: 0, skippedOldDeletion: 0 };
  const rationales = new Set();
  for (const f of PTP_FILES) for (const r of readPtpFile(f, stats)) rationales.add(r.rationale);
  console.log(`ncci_ptp: scanned ${fmt(stats.read)} rows, ${fmt(stats.skippedModifier9)} modifier-9 and ${fmt(stats.skippedOldDeletion)} pre-2024-deletion skipped`);
  const ids = await loadRationales(db, rationales);

  // Pass 2: upsert in batches of 5,000, file by file.
  const seen = new Set();
  let batch = [];
  let total = 0;
  const flush = async () => {
    if (batch.length === 0) return;
    await upsertBatch(db, "ncci_ptp", batch, "edit_set,column1_code,column2_code,effective_date");
    total += batch.length;
    batch = [];
    console.log(`ncci_ptp: ${fmt(total)} / ${fmt(EXPECTED.ncci_ptp)}`);
  };
  const s2 = { read: 0, skippedModifier9: 0, skippedOldDeletion: 0 };
  for (const f of PTP_FILES) {
    for (const r of readPtpFile(f, s2)) {
      const key = `${r.col1}${r.col2}${r.effective}`;
      if (seen.has(key)) fail("ncci_ptp: duplicate primary key in source files");
      seen.add(key);
      batch.push({
        edit_set: 1,
        column1_code: r.col1,
        column2_code: r.col2,
        effective_date: r.effective,
        deletion_date: r.deleted,
        modifier_indicator: r.modifier,
        rationale_id: ids.get(r.rationale),
        source_release: PTP_RELEASE,
      });
      if (batch.length === BATCH_SIZE) await flush();
    }
  }
  await flush();
}

// ---------------------------------------------------------------------------
// ncci_mue
// ---------------------------------------------------------------------------
async function importMue(db) {
  const file = "data/mue/MCR_MUE_PractitionerServices_Eff_10-01-2026.csv";
  const rows = parseCsv(fs.readFileSync(file, "latin1")).filter((c) => CODE.test(c[0] ?? ""));
  const seen = new Set();
  const out = rows.map((c) => {
    if (c.length !== 4) fail("ncci_mue: unexpected column count");
    if (seen.has(c[0])) fail("ncci_mue: duplicate code");
    seen.add(c[0]);
    if (!/^\d+$/.test(c[1])) fail("ncci_mue: MUE value is not a non-negative integer");
    const adj = splitAdjudication(c[2]);
    if (c[3].trim() === "") fail("ncci_mue: blank rationale");
    return {
      code: c[0],
      service_type: "practitioner",
      mue_value: Number(c[1]),
      adjudication_indicator: adj.indicator,
      adjudication_text: adj.text,
      rationale: c[3].trim(),
      source_release: MUE_RELEASE,
    };
  });
  await upsertAll(db, "ncci_mue", out, "code,service_type");
}

// ---------------------------------------------------------------------------
// gpci
// ---------------------------------------------------------------------------
async function importGpci(db) {
  const rows = parseCsv(fs.readFileSync("data/rvu/GPCI2026.csv", "utf8")).filter((c) => /^\d{5}$/.test(c[0] ?? ""));
  const seen = new Set();
  const out = rows.map((c) => {
    if (c.length < 8) fail("gpci: unexpected column count");
    const key = `${c[0]}|${c[2]}`;
    if (seen.has(key)) fail("gpci: duplicate MAC + locality");
    seen.add(key);
    if (!/^[A-Z]{2}$/.test(c[1])) fail("gpci: bad state code");
    if (!/^\d{2}$/.test(c[2])) fail("gpci: bad locality number");
    return {
      mac_code: c[0],
      locality_number: c[2],
      state_code: c[1],
      // Trailing "*" / "**" are footnote markers in the published table, not part of the name.
      locality_name: c[3].replace(/\s*\*+$/, "").trim(),
      work_gpci_nofloor_x1000: scaled(c[4], 3, "gpci work (no floor)"),
      work_gpci_floor_x1000: scaled(c[5], 3, "gpci work (floor)"),
      pe_gpci_x1000: scaled(c[6], 3, "gpci pe"),
      mp_gpci_x1000: scaled(c[7], 3, "gpci mp"),
      source_release: RVU_RELEASE,
    };
  });
  await upsertAll(db, "gpci", out, "mac_code,locality_number");
}

// ---------------------------------------------------------------------------
// mpfs_rates
// ---------------------------------------------------------------------------
const RVU_COLS = { work: 5, nfpe: 6, fpe: 8, mp: 10 };
const MODIFIERS = new Set(["", "26", "TC", "53"]);

/** Reads a PFS CSV; skips the 10 preamble lines and fully empty rows only. */
function readPfs(name) {
  const all = parseCsv(fs.readFileSync(`data/rvu/${name}`, "utf8"));
  const header = all.findIndex((c) => c[0] === "HCPCS" && c[1] === "MOD");
  if (header < 0) fail(`${name}: header row not found`);
  const rows = all.slice(header + 1).filter((c) => c.some((x) => x.trim() !== ""));
  const map = new Map();
  for (const c of rows) {
    if (c.length !== 32) fail(`${name}: unexpected column count`);
    if (!CODE.test(c[0])) fail(`${name}: bad HCPCS code`);
    if (!MODIFIERS.has(c[1])) fail(`${name}: unexpected modifier`);
    const key = `${c[0]}|${c[1]}`;
    if (map.has(key)) fail(`${name}: duplicate code + modifier`);
    map.set(key, c);
  }
  return map;
}

async function importMpfs(db) {
  const base = readPfs("PPRRVU2026_Jan_nonQPP.csv");
  const qpp = readPfs("PPRRVU2026_Jan_QPP.csv");
  const out = [];
  for (const [key, c] of base) {
    const rvu = (i, label) => scaled(c[i], 2, `mpfs ${label}`); // blank or malformed => throws
    const row = {
      hcpcs_code: c[0],
      modifier: c[1],
      status_code: c[3],
      work_rvu_x100: rvu(RVU_COLS.work, "work RVU"),
      nonfacility_pe_rvu_x100: rvu(RVU_COLS.nfpe, "non-facility PE RVU"),
      facility_pe_rvu_x100: rvu(RVU_COLS.fpe, "facility PE RVU"),
      malpractice_rvu_x100: rvu(RVU_COLS.mp, "MP RVU"),
      nonfacility_pe_na: c[7] === "NA",
      facility_pe_na: c[9] === "NA",
      conversion_factor_x10000: scaled(c[25], 4, "mpfs conversion factor"),
      qpp_conversion_factor_x10000: null,
      pctc_indicator: blankToNull(c[13]),
      global_days: blankToNull(c[14]),
      mult_proc_indicator: blankToNull(c[18]),
      bilat_surg_indicator: blankToNull(c[19]),
      asst_surg_indicator: blankToNull(c[20]),
      co_surg_indicator: blankToNull(c[21]),
      team_surg_indicator: blankToNull(c[22]),
      source_release: RVU_RELEASE,
    };
    if (!["", "NA"].includes(c[7]) || !["", "NA"].includes(c[9])) fail("mpfs: unexpected NA indicator");
    if (row.conversion_factor_x10000 <= 0) fail("mpfs: non-positive conversion factor");
    const q = qpp.get(key);
    if (q) {
      // The migration assumes both files carry identical RVUs; verify rather than trust.
      for (const i of Object.values(RVU_COLS)) if (q[i] !== c[i]) fail("mpfs: QPP and non-QPP RVUs differ");
      if (q[3] !== c[3] || q[7] !== c[7] || q[9] !== c[9]) fail("mpfs: QPP and non-QPP status/NA flags differ");
      row.qpp_conversion_factor_x10000 = scaled(q[25], 4, "mpfs QPP conversion factor");
    }
    out.push(row);
  }
  for (const key of qpp.keys()) if (!base.has(key)) fail("mpfs: QPP row with no non-QPP counterpart");
  await upsertAll(db, "mpfs_rates", out, "hcpcs_code,modifier");
}

// ---------------------------------------------------------------------------
async function main() {
  const stage = process.argv.find((a) => a.startsWith("--stage="))?.slice(8);
  if (!["small", "ptp", "all"].includes(stage ?? "")) fail("usage: --stage=small|ptp|all");
  const db = serviceClient();
  for (const t of ["ncci_ptp_rationale", "ncci_ptp", "ncci_mue", "mpfs_rates", "gpci"]) await rowCount(db, t); // tables exist?

  const expected = {};
  if (stage !== "ptp") {
    // Rationale strings are loaded here as part of the small tables; ptp stage re-upserts them (idempotent).
    const strings = new Set();
    const st = { read: 0, skippedModifier9: 0, skippedOldDeletion: 0 };
    for (const f of PTP_FILES) for (const r of readPtpFile(f, st)) strings.add(r.rationale);
    await loadRationales(db, strings);
    await importMue(db);
    await importGpci(db);
    await importMpfs(db);
    Object.assign(expected, { ncci_mue: EXPECTED.ncci_mue, gpci: EXPECTED.gpci, mpfs_rates: EXPECTED.mpfs_rates });
  }
  if (stage !== "small") {
    await importPtp(db);
    expected.ncci_ptp = EXPECTED.ncci_ptp;
  }
  if (!(await verifyCounts(db, expected))) fail("Row counts differ from expected");
  console.log("\nAll row counts match.");
}

main().catch((e) => {
  console.error(`FAILED: ${e instanceof Error ? e.message : "unknown error"}`);
  process.exit(1);
});
