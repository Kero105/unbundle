export const BATCH_SIZE = 5000;
const fmt = (n) => n.toLocaleString("en-US");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Error text safe to print: code + message only (Postgres "details" can echo row values). */
function safeError(error) {
  return `code=${error.code ?? "n/a"} message=${String(error.message ?? "").slice(0, 200)}`;
}

/** Upsert one batch with retries (upserts are idempotent, so retrying is safe). */
export async function upsertBatch(db, table, rows, onConflict) {
  for (let attempt = 1; ; attempt++) {
    let error = null;
    try {
      ({ error } = await db.from(table).upsert(rows, { onConflict }));
    } catch (e) {
      error = { message: e instanceof Error ? e.message : "network error" };
    }
    if (!error) return;
    if (attempt >= 3) throw new Error(`${table}: upsert failed (${safeError(error)})`);
    await sleep(1000 * attempt);
  }
}

/** Upsert rows in batches of BATCH_SIZE, printing counts only. */
export async function upsertAll(db, table, rows, onConflict) {
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await upsertBatch(db, table, batch, onConflict);
    done += batch.length;
    console.log(`${table}: ${fmt(done)} / ${fmt(rows.length)}`);
  }
}

export async function rowCount(db, table) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: count failed (${safeError(error)})`);
  return count;
}

/** Compare table counts to expected; prints a summary and returns true when all match. */
export async function verifyCounts(db, expected) {
  let ok = true;
  console.log("\nRow counts (actual vs expected):");
  for (const [table, want] of Object.entries(expected)) {
    const got = await rowCount(db, table);
    const match = got === want;
    if (!match) ok = false;
    console.log(`  ${table.padEnd(20)} ${fmt(got).padStart(10)} / ${fmt(want).padStart(10)}  ${match ? "OK" : "MISMATCH"}`);
  }
  return ok;
}
