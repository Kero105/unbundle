// Pure parsing helpers for the reference-data importers. No I/O, no logging of row contents.

/** RFC 4180 CSV parser (quoted fields, embedded newlines, CRLF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

/**
 * Decimal string -> scaled integer using string math only (no floats).
 * "1.46" with places=2 -> 146. Throws on blank or malformed input: a blank is a
 * failure, never 0.
 */
export function scaled(value, places, label) {
  const s = (value ?? "").trim();
  const m = new RegExp(`^(-?)(\\d+)\\.(\\d{${places}})$`).exec(s);
  if (!m) throw new Error(`${label}: expected a decimal with ${places} places, got ${s === "" ? "blank" : "malformed value"}`);
  const n = Number(m[2] + m[3]);
  return m[1] ? -n : n;
}

/** YYYYMMDD -> YYYY-MM-DD, or null for the file's "*" (no date). Throws otherwise. */
export function ymd(value, label) {
  if (value === "*") return null;
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (!m) throw new Error(`${label}: bad date`);
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** "2 Date of Service Edit: Policy" -> { indicator: 2, text: "Date of Service Edit: Policy" } */
export function splitAdjudication(value) {
  const m = /^([123]) (.+)$/.exec(value.trim());
  if (!m) throw new Error("MUE adjudication: unexpected format");
  return { indicator: Number(m[1]), text: m[2] };
}

export const blankToNull = (v) => (v.trim() === "" ? null : v.trim());
